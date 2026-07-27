import type { Direction, TableLabels } from "@adapttable/core";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";

/** Props for {@link FilterPanel}. */
export interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  filters: ReactNode;
  activeFilterCount: number;
  onClearFilters?: () => void;
  labels: Required<TableLabels>;
  dir?: Direction;
  classNames: DataTableClassNames;
}

/** Backdrop + side drawer for caller-provided filter widgets. */
export function FilterPanel({
  open,
  onClose,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  dir = "ltr",
  classNames,
}: Readonly<FilterPanelProps>) {
  const panelRef = useRef<HTMLDialogElement>(null);
  // Keep the latest onClose without re-running the open/close effect on every
  // parent render (which would restore focus prematurely).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // While open: close on Escape, move focus into the panel, and restore focus
  // to the trigger on close — basic dialog a11y the hand-rolled drawer needs.
  useEffect(() => {
    if (!open) return;
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  // PORTAL to <body>: the drawer is position-fixed, and any transformed /
  // filtered ancestor (animations, marketing chrome) would otherwise become
  // its containing block — re-anchoring the "fixed" sheet inside the page.
  // Open-only rendering keeps this SSR-safe.
  return createPortal(
    <>
      <button
        type="button"
        aria-label={labels.cancel}
        data-adapttable-part="filters-backdrop"
        className={cx(
          "adapttable-filters-backdrop",
          classNames.filtersBackdrop
        )}
        onClick={onClose}
      />
      <dialog
        ref={panelRef}
        open
        tabIndex={-1}
        aria-modal="true"
        aria-label={labels.filters}
        data-adapttable-part="filters-panel"
        // Real dir, not just the styling hook: the portal moves the dialog
        // out of the table's [dir] subtree, so logical insets (and the
        // panel's own text direction) must carry their own context.
        dir={dir}
        data-dir={dir}
        className={cx("adapttable-filters-panel", classNames.filtersPanel)}
        // Structural side-sheet geometry (consumer classes style the
        // surface): the <dialog> UA stylesheet centers via auto margins and
        // inset-inline 0/0 — pin to the inline END edge, full height,
        // following the writing direction.
        style={{
          position: "fixed",
          insetBlock: 0,
          insetInlineEnd: 0,
          insetInlineStart: "auto",
          margin: 0,
          maxHeight: "none",
          maxWidth: "none",
          height: "100%",
          zIndex: 200,
        }}
      >
        <header
          data-adapttable-part="filters-header"
          className={classNames.filtersHeader}
        >
          <h3
            data-adapttable-part="filters-title"
            className={classNames.filtersTitle}
          >
            {labels.filters}
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </h3>
          <button
            type="button"
            aria-label={labels.cancel}
            data-adapttable-part="filters-close"
            className={classNames.filtersClose}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div
          data-adapttable-part="filters-body"
          className={classNames.filtersBody}
        >
          {filters}
        </div>
        <footer
          data-adapttable-part="filters-footer"
          className={classNames.filtersFooter}
        >
          <button
            type="button"
            onClick={() => onClearFilters?.()}
            disabled={activeFilterCount === 0}
            data-adapttable-part="filters-clear"
            className={classNames.filtersClear}
          >
            {labels.clearAll}
          </button>
          <button
            type="button"
            onClick={onClose}
            data-adapttable-part="filters-done"
            className={classNames.filtersDone}
          >
            {labels.filtersDone}
          </button>
        </footer>
      </dialog>
    </>,
    document.body
  );
}
