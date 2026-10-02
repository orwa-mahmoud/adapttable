import { ConfigProvider } from "antd";
import { type Ref, useCallback, useContext, useRef } from "react";

import type { AntdTableRef } from "./antdRowScroll";

/** A nested table lives inside one of this table's normal or virtual cells. */
function ownsTablePart(root: HTMLElement, element: Element, prefix: string) {
  let parent = element.parentElement;
  while (parent && parent !== root) {
    if (
      parent.classList.contains(`${prefix}-wrapper`) ||
      parent.classList.contains(`${prefix}-cell`)
    ) {
      return false;
    }
    parent = parent.parentElement;
  }
  return parent === root;
}

function nameExpansionParts(element: HTMLElement, prefix: string): void {
  if (element.classList.contains(`${prefix}-row-expand-icon-cell`)) {
    if (element.tagName === "TH")
      element.dataset.adapttablePart = "expand-header";
    else element.dataset.adapttablePart = "expand-cell";
  }
  if (!element.classList.contains(`${prefix}-expanded-row`)) return;
  element.dataset.adapttablePart = "detail-row";
  for (const cell of element.children) {
    if (
      cell instanceof HTMLElement &&
      cell.classList.contains(`${prefix}-cell`)
    ) {
      cell.dataset.adapttablePart = "detail-cell";
    }
  }
}

/** Name Ant's own footer section, including alignment-only padding cells. */
function nameSummaryParts(footer: HTMLTableSectionElement): void {
  footer.dataset.adapttablePart = "summary";
  for (const row of footer.rows) {
    row.dataset.adapttablePart = "summary-row";
    for (const cell of row.cells) cell.dataset.adapttablePart = "summary-cell";
  }
}

function nameTableParts(root: HTMLElement, prefix: string): void {
  for (const footer of root.querySelectorAll("tfoot")) {
    if (
      footer.classList.contains(`${prefix}-summary`) &&
      ownsTablePart(root, footer, prefix)
    ) {
      nameSummaryParts(footer);
    }
  }
  for (const element of root.querySelectorAll<HTMLElement>("th, td, tr, div")) {
    if (ownsTablePart(root, element, prefix))
      nameExpansionParts(element, prefix);
  }
}

/**
 * Ant's summary and expansion cells do not forward arbitrary attributes.
 * Name their real elements through its public table ref. Observe child
 * insertion because Ant's virtual body can replace rows without rendering
 * the adapter again. Attribute writes cannot retrigger this observer.
 */
export function useAntdTableParts(forwardedRef: Ref<AntdTableRef> | undefined) {
  const observerRef = useRef<MutationObserver | null>(null);
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext);
  const prefix = getPrefixCls("table");
  return useCallback(
    (table: AntdTableRef | null) => {
      // Ref replacement covers a different nativeElement, a changed prefix,
      // unmount, and the kit switching its regular and virtual table bodies.
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (table) {
        const root = table.nativeElement;
        const nameParts = () => nameTableParts(root, prefix);
        nameParts();
        const observer = new MutationObserver(nameParts);
        observer.observe(root, { childList: true, subtree: true });
        observerRef.current = observer;
      }
      if (typeof forwardedRef === "function") {
        const cleanup = forwardedRef(table);
        if (typeof cleanup === "function") {
          const observer = observerRef.current;
          return () => {
            observer?.disconnect();
            cleanup();
          };
        }
      } else if (forwardedRef) {
        forwardedRef.current = table;
      }
    },
    [forwardedRef, prefix]
  );
}
