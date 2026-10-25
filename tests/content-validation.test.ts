import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test, type TestContext } from "node:test";

const tsxUrl = import.meta.resolve("tsx");

async function fixtureDirectory(t: TestContext) {
  const directory = await mkdtemp(path.join(tmpdir(), "rezero-content-validation-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function runFixture(directory: string, moduleName: string, expression: string) {
  const moduleUrl = new URL(`../src/lib/content/${moduleName}.server.ts`, import.meta.url).href;
  // Each process isolates module-level paths and caches from the repository's real content.
  const script = `
    try {
      const reader = await import(${JSON.stringify(moduleUrl)});
      const value = await ${expression};
      console.log(JSON.stringify({ value }));
    } catch (error) {
      console.log(JSON.stringify({ error: error.message, causeCode: error.cause?.code }));
    }
  `;
  return JSON.parse(execFileSync(process.execPath, ["--import", tsxUrl, "--input-type=module", "--eval", script], {
    cwd: directory,
    env: { ...process.env, NODE_ENV: "development" },
    encoding: "utf8",
  }));
}

async function imageFixture(t: TestContext, manifest?: string) {
  const directory = await fixtureDirectory(t);
  await mkdir(path.join(directory, "content/images"), { recursive: true });
  await writeFile(path.join(directory, "content/images/illustration.webp"), "fixture");
  if (manifest !== undefined) await writeFile(path.join(directory, "content/images.json"), manifest);
  return directory;
}

function resolveFixtureImage(directory: string, imagePath = "illustration.webp") {
  return runFixture(directory, "images", `reader.resolveContentImage(${JSON.stringify(imagePath)}, "chapter.md")`);
}

test("valid image dimensions become public image metadata", async (t) => {
  const directory = await imageFixture(t, JSON.stringify({ "illustration.webp": { width: 1400, height: 2100 } }));
  assert.deepEqual(resolveFixtureImage(directory), {
    value: { src: "/img/illustration.webp", width: 1400, height: 2100 },
  });
});

test("image manifests reject invalid JSON and non-object roots with their source path", async (t) => {
  for (const source of ["{", "null", "[]", "12", '"manifest"']) {
    await t.test(source, async (t) => {
      const directory = await imageFixture(t, source);
      const result = resolveFixtureImage(directory);
      assert.match(result.error, /content\/images\.json:/);
      assert.match(result.error, source === "{" ? /invalid JSON/ : /expected an object/);
    });
  }
});

test("every image manifest entry requires positive integer width and height", async (t) => {
  const invalidSizes = [
    {}, null, [], "1400x2100",
    { width: 0, height: 10 }, { width: -1, height: 10 }, { width: "10", height: 10 },
    { width: 1.5, height: 10 }, { width: null, height: 10 }, { width: 10 },
    { width: 10, height: 0 }, { width: 10, height: -1 }, { width: 10, height: "10" },
    { width: 10, height: 1.5 }, { width: 10, height: null },
  ];
  for (const size of invalidSizes) {
    await t.test(JSON.stringify(size), async (t) => {
      const directory = await imageFixture(t, JSON.stringify({ "illustration.webp": size }));
      assert.match(resolveFixtureImage(directory).error,
        /content\/images\.json: image "illustration\.webp" must have positive integer "width" and "height"/);
    });
  }
});

test("missing manifests and entries fail only when an image needs dimensions", async (t) => {
  const directory = await imageFixture(t);
  assert.deepEqual(runFixture(directory, "images", "Promise.resolve(true)"), { value: true });
  assert.match(resolveFixtureImage(directory).error, /chapter\.md: image "illustration\.webp" is missing/);
  await writeFile(path.join(directory, "content/images.json"), "{}");
  assert.match(resolveFixtureImage(directory).error, /missing from content\/images\.json/);
  await writeFile(path.join(directory, "content/images/toString"), "fixture");
  assert.match(resolveFixtureImage(directory, "toString").error, /missing from content\/images\.json/);
});

test("manifest read failures are not treated as missing entries", async (t) => {
  const directory = await imageFixture(t);
  await mkdir(path.join(directory, "content/images.json"));
  const result = resolveFixtureImage(directory);
  assert.match(result.error, /content\/images\.json: could not read image manifest/);
  assert.equal(result.causeCode, "EISDIR");
});

async function mangaFixture(t: TestContext, origin: string) {
  const directory = await fixtureDirectory(t);
  const workDirectory = path.join(directory, "content/manga/test-work");
  const volumeDirectory = path.join(workDirectory, "volume-01");
  await mkdir(volumeDirectory, { recursive: true });
  await writeFile(path.join(workDirectory, "work.yaml"),
    `title: Test\nauthor: Author\ndescription: Description\nimages: ${JSON.stringify(origin)}\n`);
  await writeFile(path.join(volumeDirectory, "volume.yaml"), "title: Volume\nnumber: 1\n");
  for (const number of [1, 2]) {
    await writeFile(path.join(volumeDirectory, `chapter-0${number}.yaml`),
      `title: Chapter ${number}\nnumber: ${number}\npages: [[1400, 2100], [1400, 2200], [1400, 2300]]\n`);
  }
  return directory;
}

test("HTTPS manga origins normalize before chapter and next-chapter page URLs are joined", async (t) => {
  for (const origin of ["https://images.example", "https://images.example/", "https://IMAGES.example:443/", "https://images.example:8443/"]) {
    await t.test(origin, async (t) => {
      const directory = await mangaFixture(t, origin);
      const { value: chapter } = runFixture(directory, "manga",
        'reader.getMangaChapter("test-work", "volume-01", "chapter-01")');
      const expectedOrigin = new URL(origin).origin;
      assert.equal(chapter.imagesOrigin, expectedOrigin);
      assert.equal(chapter.pages[0].src, `${expectedOrigin}/test-work/volume-01/chapter-01/001.webp`);
      assert.deepEqual(chapter.nextPages, [
        `${expectedOrigin}/test-work/volume-01/chapter-02/001.webp`,
        `${expectedOrigin}/test-work/volume-01/chapter-02/002.webp`,
      ]);
    });
  }
});

test("manga origins reject malformed URLs, credentials, paths, queries and fragments", async (t) => {
  const origins = [
    "not-a-url", "http://images.example", "https://", "https://images.example:99999",
    "https://user:secret@images.example", "https://@images.example", "https://images.example/path",
    "https://images.example/../", "https://images.example//", "https://images.example?x=1",
    "https://images.example?", "https://images.example/#part", "https://images.example#",
    "https://images.example\\path", " https://images.example", "https://images.example\n",
  ];
  for (const origin of origins) {
    await t.test(JSON.stringify(origin), async (t) => {
      const directory = await mangaFixture(t, origin);
      const result = runFixture(directory, "manga", "reader.getMangaWorks()");
      assert.match(result.error, /test-work\/work\.yaml: "images" must be an https origin/);
    });
  }
});
