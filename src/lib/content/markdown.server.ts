import { readFile } from "node:fs/promises";
import path from "node:path";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

type ImageSize = { width: number; height: number };

// Minimal HAST shape; enough to walk the tree and rewrite <img> elements.
type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

const imageManifestFile = path.resolve("content", "images.json");

let imageManifestPromise: Promise<Record<string, ImageSize>> | undefined;

// The manifest is written by the image conversion script: bucket path -> pixel size.
function loadImageManifest() {
  imageManifestPromise ??= readFile(imageManifestFile, "utf8").then(
    (source) => JSON.parse(source) as Record<string, ImageSize>,
    () => ({}),
  );
  return imageManifestPromise;
}

function visitElements(node: HastNode, visitor: (element: HastNode) => void) {
  if (node.type === "element") visitor(node);
  node.children?.forEach((child) => visitElements(child, visitor));
}

// Points illustrations at the R2 domain and adds the attributes needed to avoid layout shift.
function rehypeContentImages(manifest: Record<string, ImageSize>, sourceFile: string) {
  return () => (tree: HastNode) => {
    visitElements(tree, (element) => {
      if (element.tagName !== "img" || !element.properties) return;

      const imagePath = String(element.properties.src ?? "");
      if (/^[a-z]+:\/\//i.test(imagePath)) {
        throw new Error(`${sourceFile}: external image "${imagePath}"; content images must live in R2.`);
      }

      const size = manifest[imagePath];
      if (!size) throw new Error(`${sourceFile}: image "${imagePath}" is missing from content/images.json.`);

      const imagesUrl = process.env.CONTENT_IMAGES_URL;
      if (!imagesUrl) throw new Error(`${sourceFile}: set CONTENT_IMAGES_URL to build chapters with images.`);

      Object.assign(element.properties, {
        src: `${imagesUrl.replace(/\/$/, "")}/${imagePath}`,
        width: size.width,
        height: size.height,
        loading: "lazy",
        decoding: "async",
      });
    });
  };
}

export async function renderMarkdown(markdown: string, sourceFile: string): Promise<string> {
  const manifest = await loadImageManifest();
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    // Raw HTML inside Markdown is dropped: remark-rehype ignores it unless explicitly allowed.
    .use(remarkRehype, {
      footnoteLabel: "Notas",
      footnoteLabelProperties: {},
      footnoteBackLabel: (referenceIndex) => `Volver a la referencia ${referenceIndex + 1}`,
    })
    .use(rehypeContentImages(manifest, sourceFile))
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}
