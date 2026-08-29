import type { Direction, TableLabels } from "@adapttable/core";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import {
  OVERLAY_Z,
  placeOverlayBelowTrigger,
  VIEWPORT_GUTTER,
} from "./overlayPlacement";

/**
 * Props for {@link FilterPopover}.
 *
 * @public
 */
export interface FilterPopoverProps {
  /** Whether the overlay is showing. */
  open: boolean;
  /** Closes the overlay. Filters apply live, so this only dismisses it. */
  onClose: () => void;
  /** The filter fields to render inside. */
  filters: ReactNode;
  /** How many filters are currently set, for the header count. */
  activeFilterCount: number;
  /** Clears every active filter. */
  onClearFilters?: () => void;
  /** Resolved labels, every key filled. */
  labels: Required<TableLabels>;
  /** Writing direction, so the overlay opens on the correct side. */
  dir?: Direction;
  /** Per-part classes. */
  classNames: DataTableClassNames;
  /** The Filters trigger button — the popover anchors beneath it. */
  children: ReactNode;
}

/**
 * Anchored filter card (the default filter container). Opens beneath the
 * Filters button with NO backdrop — the background stays visible and
 * interactive; clicking outside the popover/anchor or pressing Escape closes
 * it. Portalled to `document.body` so sticky headers cannot paint over it.
 * Pair with `filtersMode="drawer"` for the slide-in panel (`FilterPanel`).
 *
 * @public
 */
export function FilterPopover({
  open,
  onClose,
  filters,
  activeFilterCount,
  onClearFilters,
  labels,
  dir = "ltr",
  classNames,
  children,
}: Readonly<FilterPopoverProps>) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const rootRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      const root = rootRef.current!;
      const target = event.target as Node;
      if (!document.contains(target)) return;
      if (root.contains(target)) return;
      if (cardRef.current?.contains(target)) return;
      if (cardRef.current?.contains(document.activeElement)) return;
      onCloseRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onCloseRef.current();
      rootRef.current?.querySelector("button")?.focus();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    const root = rootRef.current;
    if (!card || !root) return;
    const place = () => placeOverlayBelowTrigger(card, root, dir);
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, dir]);

  const card = open ? (
    <div
      ref={cardRef}
      data-adapttable-part="filters-popover"
      dir={dir}
      data-dir={dir}
      className={cx("adapttable-filters-popover", classNames.filtersPopover)}
      style={{
        position: "fixed",
        zIndex: OVERLAY_Z,
        width: 380,
        maxWidth: `calc(100vw - ${VIEWPORT_GUTTER * 2}px)`,
        overflowY: "auto",
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
          onClick={() => onClearFilters?.()}
          disabled={activeFilterCount === 0}
          data-adapttable-part="filters-clear"
          className={classNames.filtersClear}
        >
          {labels.clearAll}
        </button>
      </header>
      <div
        data-adapttable-part="filters-body"
        className={classNames.filtersBody}
      >
        {filters}
      </div>
    </div>
  ) : null;

  return (
    <span
      ref={rootRef}
      data-adapttable-part="filters-anchor"
      className={cx("adapttable-filters-anchor", classNames.filtersAnchor)}
      style={{ position: "relative", display: "inline-flex" }}
    >
      {children}
      {card && createPortal(card, document.body)}
    </span>
  );
}
