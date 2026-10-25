function getImages(element: Element): HTMLImageElement[] {
  return element.tagName === "IMG"
    ? [element as HTMLImageElement]
    : Array.from(element.querySelectorAll<HTMLImageElement>("img"));
}

export function cloneThemeContent(source: Element, snapshotDocument: Document) {
  // Clone in the template's inert owner document: even a detached eager image
  // could otherwise start a request before we get a chance to clear its sources.
  const clone = snapshotDocument.importNode(source, true);

  // A wave is a snapshot, not another responsive-image consumer. Freeze the
  // selected loaded candidate below instead of letting <picture> choose anew.
  for (const candidate of clone.querySelectorAll("picture source")) {
    candidate.removeAttribute("srcset");
    candidate.removeAttribute("src");
  }

  const sourceImages = getImages(source);
  const cloneImages = getImages(clone);
  for (const [index, image] of cloneImages.entries()) {
    const original = sourceImages[index];
    image.removeAttribute("src");
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");

    if (original.complete && original.naturalWidth > 0 && original.currentSrc) {
      image.src = original.currentSrc;
      image.loading = "eager";
      image.decoding = "sync";
    } else {
      // Lazy loading alone is not enough: the fixed wave can bring pending
      // pages into its loading margin and bypass the reader's download queue.
      const { width, height } = original.getBoundingClientRect();
      image.style.boxSizing = "border-box";
      image.style.width = `${width}px`;
      image.style.height = `${height}px`;
      image.style.visibility = "hidden";
    }
  }

  return clone;
}
