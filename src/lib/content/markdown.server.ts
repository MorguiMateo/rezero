import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { resolveContentImage } from "./images.server";

// Minimal HAST shape; enough to walk the tree and rewrite <img> elements.
type HastNode = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function visitElements(node: HastNode, visitor: (element: HastNode) => void) {
  if (node.type === "element") visitor(node);
  node.children?.forEach((child) => visitElements(child, visitor));
}

function collectImages(node: HastNode, images: HastNode[] = []): HastNode[] {
  visitElements(node, (element) => {
    if (element.tagName === "img" && element.properties) images.push(element);
  });
  return images;
}

// Points illustrations at /img and adds the attributes needed to avoid layout shift.
function rehypeContentImages(sourceFile: string) {
  return () => async (tree: HastNode) => {
    for (const image of collectImages(tree)) {
      const properties = image.properties!;
      const { src, width, height } = await resolveContentImage(String(properties.src ?? ""), sourceFile);
      Object.assign(properties, { src, width, height, loading: "lazy", decoding: "async" });
    }
  };
}

export async function renderMarkdown(markdown: string, sourceFile: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    // Raw HTML inside Markdown is dropped: remark-rehype ignores it unless explicitly allowed.
    .use(remarkRehype, {
      footnoteLabel: "Notas",
      footnoteLabelProperties: {},
      footnoteBackLabel: (referenceIndex) => `Volver a la referencia ${referenceIndex + 1}`,
    })
    .use(rehypeContentImages(sourceFile))
    .use(rehypeStringify)
    .process(markdown);
  return String(file);
}
