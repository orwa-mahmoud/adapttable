/**
 * Nearest writing direction for a grip or handle.
 *
 * `closest("[dir]")` is not enough: Radix `Table.Root` wraps the table in a
 * ScrollArea that stamps `dir="ltr"` on the viewport, then restores RTL with
 * CSS (`direction: rtl` on `.rt-ScrollAreaViewport`). Trust the computed
 * style first; when that throws (jsdom stubs) or reports the initial `ltr`,
 * walk ancestors and skip those forced-ltr scroll wrappers so the table's
 * own `dir` wins.
 *
 * @public
 */
export function isRtlElement(element: HTMLElement | null): boolean {
  if (element == null) return false;
  try {
    if (globalThis.getComputedStyle(element).direction === "rtl") return true;
  } catch {
    // Stubs and detached nodes are not Elements jsdom will measure.
  }
  if (element.nodeType === 1) {
    let node: Element | null = element;
    while (node) {
      const attr = node.getAttribute("dir");
      if (attr === "rtl") return true;
      if (attr === "ltr" && !isForcedLtrWrapper(node)) return false;
      node = node.parentElement;
    }
    return false;
  }
  const scoped = element.closest("[dir]");
  return scoped?.getAttribute("dir") === "rtl";
}

function isForcedLtrWrapper(node: Element): boolean {
  const cls = node.getAttribute("class") ?? "";
  return cls.includes("rt-ScrollArea");
}
