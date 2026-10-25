import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join, relative, resolve, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const clientDirectory = resolve("build/client");
const shutdown = new AbortController();
let signalCode: number | undefined;

async function getUnusedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address !== "string");
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const children = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : Promise.resolve([path]);
  }));
  return children.flat();
}

function assertDocument(html: string, path: string) {
  assert.match(html, /<!doctype html>/i, `${path}: missing HTML document`);
  assert.match(html, /<html\b[^>]*\blang="es"/i, `${path}: missing Spanish language`);
  assert.match(html, /<title>[^<]+<\/title>/i, `${path}: missing title`);
  assert.match(html, /<main\b[\s\S]*<h1\b[^>]*>[\s\S]*<\/h1>[\s\S]*<\/main>/i, `${path}: missing prerendered content`);
  assert.match(html, /<\/body>\s*<\/html>\s*$/i, `${path}: incomplete document`);
}

async function main() {
  const files = await listFiles(clientDirectory);
  const notFoundHtml = await readFile(join(clientDirectory, "404.html"), "utf8");
  assertDocument(notFoundHtml, "404.html");
  assert.match(notFoundHtml, /Página no encontrada/);
  assert.match(notFoundHtml, /Volver al inicio/);
  const staticNotFoundMarker = /<body\b[^>]*\sdata-static-not-found(?:=|\s|>)/i;
  assert.match(notFoundHtml, staticNotFoundMarker, "404.html: missing static fallback marker");
  const pageFiles = files.filter((file) => file.endsWith(`${sep}index.html`)).sort();
  assert(pageFiles.includes(join(clientDirectory, "index.html")), "Missing prerendered home page");
  assert(pageFiles.includes(join(clientDirectory, "estilos", "index.html")), "Missing prerendered style guide");

  const port = await getUnusedPort();
  const origin = `http://127.0.0.1:${port}`;
  // A dedicated process group lets cleanup reach Wrangler and workerd, not just pnpm.
  const preview = spawn("pnpm", ["preview", "--ip", "127.0.0.1", "--port", String(port), "--inspector-port", "0"], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, CI: "true", WRANGLER_SEND_METRICS: "false" },
  });
  let output = "";
  let spawnError: Error | undefined;
  preview.on("error", (error) => { spawnError = error; });
  const capture = (chunk: Buffer) => { output = (output + chunk.toString()).slice(-12_000); };
  preview.stdout.on("data", capture);
  preview.stderr.on("data", capture);

  const groupExists = () => {
    if (!preview.pid) return false;
    try {
      process.kill(-preview.pid, 0);
      return true;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "ESRCH") return false;
      // A group can briefly report EPERM while its processes are exiting on macOS.
      if (code === "EPERM") return true;
      throw error;
    }
  };
  const signalGroup = (signal: NodeJS.Signals) => {
    if (!preview.pid) return;
    try { process.kill(-preview.pid, signal); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error; }
  };
  async function request(path: string) {
    const response = await fetch(`${origin}${path}`, {
      redirect: "error",
      signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(5_000)]),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    return { response, bytes };
  }
  async function checkFile(file: string, mime?: RegExp) {
    const path = "/" + relative(clientDirectory, file).split(sep).map(encodeURIComponent).join("/");
    const { response, bytes } = await request(path);
    assert.equal(response.status, 200, `${path}: expected HTTP 200`);
    const contentType = response.headers.get("content-type") ?? "";
    if (mime) assert.match(contentType, mime, `${path}: wrong MIME type`);
    else assert.doesNotMatch(contentType, /^text\/html\b/i, `${path}: received HTML instead of loader data`);
    assert.deepEqual(bytes, await readFile(file), `${path}: served bytes differ from build`);
    return response;
  }

  try {
    const readyDeadline = Date.now() + 45_000;
    while (true) {
      shutdown.signal.throwIfAborted();
      if (spawnError) throw spawnError;
      assert(preview.exitCode === null && preview.signalCode === null, "Preview exited before becoming ready");
      try {
        const { response } = await request("/");
        if (response.ok) break;
      } catch {
        shutdown.signal.throwIfAborted();
      }
      assert(Date.now() < readyDeadline, "Preview did not become ready within 45 seconds");
      await delay(200, undefined, { signal: shutdown.signal });
    }

    for (const file of pageFiles) {
      const segments = relative(clientDirectory, file).split(sep).slice(0, -1);
      const path = "/" + segments.map(encodeURIComponent).join("/");
      const { response, bytes } = await request(path);
      assert.equal(response.status, 200, `${path}: expected HTTP 200`);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
      const html = bytes.toString("utf8");
      assertDocument(html, path);
      assert.doesNotMatch(html, staticNotFoundMarker, `${path}: normal page disables hydration`);
      assert.equal(html, await readFile(file, "utf8"), `${path}: not serving prerendered HTML`);
    }
    for (const path of ["/__smoke-missing-page", "/__smoke-missing/deep/chapter"]) {
      const { response, bytes } = await request(path);
      assert.equal(response.status, 404, `${path}: expected HTTP 404, not an SPA fallback`);
      assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
      assert.match(bytes.toString("utf8"), staticNotFoundMarker, `${path}: missing static fallback marker`);
      assert.equal(bytes.toString("utf8"), notFoundHtml, `${path}: not serving the custom 404 document`);
    }
    await checkFile(join(clientDirectory, "favicon.svg"), /^image\/svg\+xml\b/i);

    const assetFiles = files.filter((file) => file.startsWith(join(clientDirectory, "assets") + sep));
    for (const [extension, mime] of [
      [".css", /^text\/css\b/i],
      [".js", /^(?:text|application)\/javascript\b/i],
      [".woff2", /^font\/woff2\b/i],
    ] as const) {
      const matching = assetFiles.filter((file) => file.endsWith(extension));
      assert(matching.length > 0, `No emitted ${extension} assets`);
      for (const file of matching) {
        const response = await checkFile(file, mime);
        assert.match(response.headers.get("cache-control") ?? "", /max-age=31536000/);
        assert.match(response.headers.get("cache-control") ?? "", /immutable/);
      }
    }

    const dataFiles = files.filter((file) => file.endsWith(".data"));
    assert(dataFiles.some((file) => file === join(clientDirectory, "_.data")), "Missing root loader data");
    for (const file of dataFiles) {
      // Cloudflare may omit MIME for .data; React Router decodes the body, not the header.
      const response = await checkFile(file);
      assert(Number(response.headers.get("content-length")) > 0 || (await readFile(file)).length > 0);
    }
    const imageFile = files.find((file) => file.startsWith(join(clientDirectory, "img") + sep) && file.endsWith(".webp"));
    if (imageFile) {
      const response = await checkFile(imageFile, /^image\/webp\b/i);
      assert.match(response.headers.get("cache-control") ?? "", /max-age=86400/);
    }
    console.log(`Preview smoke checks passed: ${pageFiles.length} pages, 2 custom 404s, ${assetFiles.length} assets, ${dataFiles.length} loader data files${imageFile ? ", 1 content image" : ""}.`);
  } catch (error) {
    if (output) console.error("Preview output:\n" + output);
    throw error;
  } finally {
    signalGroup("SIGTERM");
    const deadline = Date.now() + 3_000;
    while (groupExists() && Date.now() < deadline) await delay(50);
    if (groupExists()) signalGroup("SIGKILL");
    // Reap the direct child so this command never leaves a running preview behind.
    if (preview.exitCode === null && preview.signalCode === null && !spawnError) {
      await new Promise<void>((resolve) => preview.once("exit", () => resolve()));
    }
  }
}

const onInterrupt = () => { signalCode = 130; shutdown.abort(new Error("Preview check interrupted")); };
const onTerminate = () => { signalCode = 143; shutdown.abort(new Error("Preview check terminated")); };
process.on("SIGINT", onInterrupt);
process.on("SIGTERM", onTerminate);
try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = signalCode ?? 1;
} finally {
  process.off("SIGINT", onInterrupt);
  process.off("SIGTERM", onTerminate);
}
