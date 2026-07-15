import type { Direction, TableLabels } from "@adapttable/core";
import { type ReactNode, useEffect, useRef } from "react";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";

/** Breathing room kept between the popover and the viewport edge, in px. */
const VIEWPORT_GUTTER = 8;

/** Props for {@link FilterPopover}. */
export interface FilterPopoverProps {
  open: boolean;
  onClose: () => void;
  filters: ReactNode;
  activeFilterCount: number;
  onClearFilters?: () => void;
  labels: Required<TableLabels>;
  dir?: Direction;
  classNames: DataTableClassNames;
  /** The Filters trigger button — the popover anchors beneath it. */
  children: ReactNode;
}

/**
 * Anchored filter card (the default filter container). Opens beneath the
 * Filters button with NO backdrop — the background stays visible and
 * interactive; clicking outside the popover/anchor or pressing Escape closes
 * it. This is the plain-DOM mirror of the Mantine reference; pair with
 * `filtersMode="drawer"` for the slide-in panel (`FilterPanel`) instead.
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
  // Keep the latest onClose without re-running the close effect on every
  // parent render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const rootRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // No scrim: close on an outside click or Escape — the background stays
  // interactive. We listen for `click` (not `mousedown`) and ignore events
  // while a control inside the popover still holds focus, so a caller's native
  // `<select>` / date / number picker — whose popup dispatches a document-level
  // event targeting outside the popover DOM — never closes it mid-edit.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      // The listener only lives while the anchor span is mounted, so the ref
      // is always set here.
      const root = rootRef.current!;
      if (root.contains(event.target as Node)) return;
      // A control inside the CARD (not the trigger) still holds focus → keep
      // open so native picker popups don't dismiss it mid-edit.
      if (cardRef.current?.contains(document.activeElement)) return;
      onCloseRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onCloseRef.current();
      // Escape strands keyboard focus inside the removed card — hand it back
      // to the trigger (the anchored child button).
      rootRef.current?.querySelector("button")?.focus();
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // The card is anchored to the trigger's inline-start edge, so on a narrow
  // screen it can hang past the viewport (a 320px card under a button sitting
  // 150px from the edge lands at -170px). Kit poppers do collision detection
  // for us; plain DOM does not, so nudge the card back inside after it mounts.
  // Runs on open and on resize/orientation change.
  useEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    if (!card) return;
    const clampIntoViewport = () => {
      // Measure unshifted, then re-apply, so repeat runs stay idempotent.
      card.style.transform = "";
      const rect = card.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      let shift = 0;
      if (rect.left < VIEWPORT_GUTTER) {
        shift = VIEWPORT_GUTTER - rect.left;
      } else if (rect.right > viewportWidth - VIEWPORT_GUTTER) {
        shift = viewportWidth - VIEWPORT_GUTTER - rect.right;
      }
      if (shift !== 0)
        card.style.transform = `translateX(${Math.round(shift)}px)`;
    };
    clampIntoViewport();
    window.addEventListener("resize", clampIntoViewport);
    return () => window.removeEventListener("resize", clampIntoViewport);
  }, [open, dir]);

  // RTL flips which edge the card aligns to: anchor to the inline-start so it
  // stays under the button on both writing directions.
  const side = dir === "rtl" ? { left: 0 } : { right: 0 };

  return (
    <span
      ref={rootRef}
      data-adapttable-part="filters-anchor"
      className={cx("adapttable-filters-anchor", classNames.filtersAnchor)}
      style={{ position: "relative", display: "inline-flex" }}
    >
      {children}
      {open && (
        <div
          ref={cardRef}
          data-adapttable-part="filters-popover"
          data-dir={dir}
          className={cx(
            "adapttable-filters-popover",
            classNames.filtersPopover
          )}
          style={{
            position: "absolute",
            top: "100%",
            zIndex: 200,
            // Shifting alone can't save a card wider than the screen.
            maxWidth: `calc(100vw - ${VIEWPORT_GUTTER * 2}px)`,
            ...side,
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
      )}
    </span>
  );
}
