import type { Direction, TableLabels } from "@adapttable/core";
import { OVERLAY_MOTION, useOverlayTransition } from "@adapttable/core/adapter";
import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";

/**
 * Props for {@link FilterPanel}.
 *
 * @public
 */
export interface FilterPanelProps {
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
}

/**
 * Backdrop + side drawer for caller-provided filter widgets.
 *
 * @public
 */
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
  // The drawer outlives `open` by one exit so it has something to animate on
  // the way out. `state` is which end of the SLIDE to render and lags a frame
  // by design; every semantic — modal, inert, focus — follows `open` itself,
  // because a dialog must be a dialog on the tick it opens and must stop being
  // one on the tick it closes, whatever the animation is still doing.
  const { rendered, state } = useOverlayTransition(open);
  const slidIn = state === "open";
  const panelRef = useRef<HTMLDialogElement>(null);
  // Keep the latest onClose without re-running the open/close effect on every
  // parent render (which would restore focus prematurely).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // While open: close on Escape, move focus into the panel, TRAP Tab
  // inside it (aria-modal promises focus cannot reach the background), and
  // restore focus to the trigger on close.
  useEffect(() => {
    // `rendered` too: on the render where `open` flips true the dialog has not
    // mounted yet, so keying on `open` alone ran this against a null ref and
    // focus never moved into the panel.
    if (!open || !rendered) return;
    const trigger = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (
        (!event.shiftKey && active === last) ||
        // Focus escaped (pointer interaction) — pull it back inside.
        (active !== null && !panel.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus?.();
    };
  }, [open, rendered]);

  if (!rendered) return null;

  // Off-screen is the inline END edge, so the panel leaves the way it arrived
  // in both writing directions.
  const offscreen = dir === "rtl" ? "translateX(-100%)" : "translateX(100%)";
  const motion = open
    ? `${OVERLAY_MOTION.enterMs}ms ${OVERLAY_MOTION.enterEasing}`
    : `${OVERLAY_MOTION.exitMs}ms ${OVERLAY_MOTION.exitEasing}`;

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
        data-state={state}
        // Leaving, it is scenery: not focusable, not clickable, not announced.
        aria-hidden={open ? undefined : true}
        tabIndex={open ? undefined : -1}
        className={cx(
          "adapttable-filters-backdrop",
          classNames.filtersBackdrop
        )}
        onClick={onClose}
        // Opacity only — the panel is the thing that travels. Consumer classes
        // still own the scrim's colour and geometry.
        style={{
          opacity: slidIn ? 1 : 0,
          transition: `opacity ${motion}`,
          pointerEvents: open ? undefined : "none",
        }}
      />
      <dialog
        ref={panelRef}
        open
        tabIndex={-1}
        // Closing hands focus back to the trigger on the same tick, so for the
        // length of the slide the panel is still painted but no longer part of
        // the page: inert keeps focus out, and dropping `aria-modal` stops
        // assistive technology reporting a modal that is already dismissed.
        aria-modal={open ? "true" : undefined}
        aria-hidden={open ? undefined : true}
        // Absent rather than `false`: React 18 serializes `inert={false}` as
        // `inert="false"`, and the attribute's mere presence makes an element
        // inert — which would freeze the panel the moment it opened.
        inert={open ? undefined : true}
        aria-label={labels.filters}
        data-adapttable-part="filters-panel"
        data-state={state}
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
        // Structural geometry AND the slide: motion is part of what a side
        // sheet is, and shipping it here is what makes the unstyled drawer
        // move at all — its consumers bring classes, not keyframes. `data-state`
        // is on the element for anyone who wants to replace this with their own.
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
          transform: slidIn ? "translateX(0)" : offscreen,
          transition: `transform ${motion}`,
          willChange: "transform",
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
