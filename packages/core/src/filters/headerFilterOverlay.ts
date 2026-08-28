/**
 * Header-filter overlay session: stay open while the field is incomplete,
 * ignore nested kit dropdowns as "outside", and optionally dismiss once
 * a complete value is written (`closeOnSelect`).
 */
import { useCallback, useEffect, useId, useState } from "react";

import type { ExtraFilters } from "../types";
import { defaultFilterRegistry } from "./filterBuiltins";
import { type FilterDef, RANGE_SUFFIXES } from "./filterDefs";
import { type FilterFormSource, scalarFilterText } from "./filterForm";
import { type FilterTypeRegistry, filterWidgetKind } from "./filterRegistry";
import { filterOpKey, isValuelessFilterOp } from "./operators";
import { readRangeWidget } from "./rangeWidget";

/**
 * Attribute tying a header filter's trigger to its overlay, so one editing
 * session is identifiable across both.
 *
 * @public
 */
export const SESSION_ATTR = "data-adapttable-header-filter";

/**
 * Props that keep one header filter's overlay session together.
 *
 * @internal
 */
export interface HeaderFilterSessionProps {
  /** Ties the trigger and its overlay to one editing session. */
  readonly [SESSION_ATTR]: string;
}

/**
 * Whether this write is a finished, single-control value — the only case
 * {@link bindHeaderFilterDismiss} will close the overlay when `closeOnSelect`
 * is on. Operator-only writes, typed terms, and multi-select toggles are
 * incomplete: another control is still waiting.
 *
 * @internal
 */
export function headerFilterFieldIsComplete<TRow>(
  def: FilterDef<TRow>,
  extra: ExtraFilters,
  registry: FilterTypeRegistry = defaultFilterRegistry
): boolean {
  const kind = filterWidgetKind(def, registry) ?? def.type;
  if (kind === "select" || kind === "boolean") {
    return scalarFilterText(extra[def.key]) !== "";
  }
  if (kind === "text") {
    const stored = extra[filterOpKey(def.key)];
    return typeof stored === "string" && isValuelessFilterOp(stored);
  }
  if (kind === "dateRange") {
    const suffixes = RANGE_SUFFIXES.dateRange;
    const widget = readRangeWidget(
      extra,
      def.key + suffixes.start,
      def.key + suffixes.end,
      filterOpKey(def.key),
      def.key,
      "date"
    );
    return widget.op != null && isValuelessFilterOp(widget.op);
  }
  return false;
}

/**
 * Wrap a filter source so a complete write can dismiss the overlay.
 * Off unless `closeOnSelect` is true — the default is stay open.
 *
 * @internal
 */
export function bindHeaderFilterDismiss<TRow>(
  source: FilterFormSource<TRow>,
  options: {
    def: FilterDef<TRow>;
    closeOnSelect?: boolean;
    dismiss: () => void;
    registry?: FilterTypeRegistry;
  }
): FilterFormSource<TRow> {
  if (options.closeOnSelect !== true) return source;
  const afterWrite = (extra: ExtraFilters): void => {
    if (headerFilterFieldIsComplete(options.def, extra, options.registry)) {
      queueMicrotask(options.dismiss);
    }
  };
  return {
    ...source,
    setExtra: (key, value) => {
      source.setExtra(key, value);
      afterWrite({ ...source.extra, [key]: value });
    },
    setExtras: (patch) => {
      source.setExtras(patch);
      afterWrite({ ...source.extra, ...patch });
    },
  };
}

/**
 * Dismiss on a true outside press or Escape. Nested kit dropdowns (and a
 * focused native `<select>` whose OS list is open) are not outside.
 *
 * @internal
 */
export function usePointerDismiss(
  open: boolean,
  dismiss: () => void,
  insideSelector: string
): void {
  useEffect(() => {
    if (!open) return;
    const isInside = (target: EventTarget | null): boolean => {
      if (target instanceof Element && target.closest(insideSelector)) {
        return true;
      }
      // Native <select> lists live outside the DOM. While that list is
      // open the select stays focused inside the overlay — a click that
      // lands on `document` after picking an option is not an outside click.
      const active = document.activeElement;
      return (
        active instanceof HTMLSelectElement &&
        active.closest(insideSelector) !== null
      );
    };
    const onPointer = (event: Event): void => {
      if (!armed) return;
      if (isInside(event.target)) return;
      dismiss();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") dismiss();
    };
    let armed = false;
    const arm = (): void => {
      armed = true;
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    queueMicrotask(arm);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, dismiss, insideSelector]);
}

/**
 * Open state + a source that honours {@link bindHeaderFilterDismiss}.
 *
 * @internal
 */
export function useHeaderFilterOverlay<TRow>(
  props: {
    source: FilterFormSource<TRow>;
    def: FilterDef<TRow>;
    closeOnSelect?: boolean;
    registry?: FilterTypeRegistry;
  },
  options?: {
    nestedSelector?: string;
    pointerDismiss?: boolean;
  }
): {
  open: boolean;
  setOpen: (open: boolean) => void;
  source: FilterFormSource<TRow>;
  sessionProps: HeaderFilterSessionProps;
  resetKey: number;
} {
  const rawId = useId();
  const id = rawId.replaceAll(":", "");
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const dismiss = useCallback(() => {
    setOpen(false);
    setResetKey((key) => key + 1);
  }, []);
  const source = bindHeaderFilterDismiss(props.source, {
    def: props.def,
    closeOnSelect: props.closeOnSelect === true,
    dismiss,
    registry: props.registry,
  });
  const session = `[${SESSION_ATTR}="${id}"]`;
  const selector = options?.nestedSelector
    ? `${session},${options.nestedSelector}`
    : session;
  usePointerDismiss(
    open && options?.pointerDismiss !== false,
    dismiss,
    selector
  );
  return {
    open,
    setOpen,
    source,
    sessionProps: { [SESSION_ATTR]: id },
    resetKey,
  };
}
