/**
 * The header-filter overlay session: which column's overlay is open, when a
 * write dismisses it, and what counts as a press outside it.
 *
 * The overlay stays open while its field is incomplete — an operator chosen
 * but no value typed, one checkbox of a multi-select ticked — and ignores
 * nested kit dropdowns as "outside". With `closeOnSelect`, a complete
 * single-control write dismisses it. A dismissal also bumps a reset key, so a
 * kit remounts the overlay's form fresh the next time it opens.
 */
import type { ExtraFilters } from "../columnModel";
import type { TableSource } from "../source/TableSource";
import { defaultFilterRegistry } from "./filterBuiltins";
import { type FilterDef, RANGE_SUFFIXES } from "./filterDefs";
import { type FilterTypeRegistry, filterWidgetKind } from "./filterRegistry";
import { filterOpKey, isValuelessFilterOp } from "./operators";
import { readRangeWidget } from "./rangeWidget";

/**
 * Attribute tying a header filter's trigger to its overlay, so one editing
 * session is identifiable across both.
 *
 * @public
 */
export const HEADER_FILTER_SESSION_ATTR = "data-adapttable-header-filter";

/**
 * Host for header-filter open state that survives a kit remounting its column
 * title — antd rebuilds `columns[].title` on every extra-filter write.
 *
 * @public
 */
export interface HeaderFilterOpenHost {
  /** Column key whose overlay is open, or `null` when none is. */
  readonly openKey: string | null;
  /** Open this column's overlay, or pass `null` to close. */
  readonly setOpenKey: (key: string | null) => void;
}

/**
 * Whether this write is a finished, single-control value — the only case
 * {@link bindHeaderFilterDismiss} closes the overlay on when `closeOnSelect`
 * is on. Operator-only writes, typed terms and multi-select toggles are
 * incomplete: another control is still waiting.
 *
 * @param def - The column's filter definition.
 * @param extra - The filter values after the write.
 * @param registry - The filter type registry.
 * @returns Whether the field is complete.
 *
 * @public
 */
export function headerFilterFieldIsComplete<TRow>(
  def: FilterDef<TRow>,
  extra: ExtraFilters,
  registry: FilterTypeRegistry = defaultFilterRegistry
): boolean {
  const kind = filterWidgetKind(def, registry) ?? def.type;
  if (kind === "select" || kind === "boolean") {
    const value = extra[def.key];
    return value != null && String(value) !== "";
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
 * The writes a header filter's form makes to the table.
 *
 * @public
 */
export type HeaderFilterWrites<TRow> = Pick<
  TableSource<TRow>,
  "extra" | "setExtra" | "setExtras"
>;

/**
 * Wrap a filter source so a complete write dismisses the overlay. Off unless
 * `closeOnSelect` is true — the default is to stay open. The dismissal runs
 * in a microtask, after the write has settled.
 *
 * @param source - The form's filter source.
 * @param options - The column's definition, the switch, the dismissal and
 *   the registry.
 * @returns The source, wrapped when `closeOnSelect` is on.
 *
 * @public
 */
export function bindHeaderFilterDismiss<
  TRow,
  TSource extends HeaderFilterWrites<TRow>,
>(
  source: TSource,
  options: {
    readonly def: FilterDef<TRow>;
    readonly closeOnSelect?: boolean;
    readonly dismiss: () => void;
    readonly registry?: FilterTypeRegistry;
  }
): TSource {
  if (options.closeOnSelect !== true) return source;
  const afterWrite = (extra: ExtraFilters): void => {
    if (headerFilterFieldIsComplete(options.def, extra, options.registry)) {
      queueMicrotask(options.dismiss);
    }
  };
  return {
    ...source,
    setExtra: (key: string, value: ExtraFilters[string]) => {
      source.setExtra(key, value);
      afterWrite({ ...source.extra, [key]: value });
    },
    setExtras: (patch: ExtraFilters) => {
      source.setExtras(patch);
      afterWrite({ ...source.extra, ...patch });
    },
  };
}

/**
 * The selector for what counts as inside one overlay session. With a shared
 * open host every header-filter session and filter header cell is inside:
 * antd clones the header cell, so two triggers share one open key, and a click
 * in the clone's overlay must not clear the other. Nested kit dropdowns the
 * binding names are inside too.
 *
 * @param input - The session id, whether a shared host holds the open state,
 *   and the kit's nested-dropdown selector.
 * @returns The CSS selector.
 *
 * @public
 */
export function headerFilterInsideSelector(input: {
  readonly sessionId: string;
  readonly sharedHost: boolean;
  readonly nestedSelector?: string;
}): string {
  const inside = input.sharedHost
    ? `[${HEADER_FILTER_SESSION_ATTR}],[data-adapttable-part="filter-header-cell"]`
    : `[${HEADER_FILTER_SESSION_ATTR}="${input.sessionId}"]`;
  return input.nestedSelector ? `${inside},${input.nestedSelector}` : inside;
}

/**
 * Dismiss on a true outside press or on Escape. A press inside the selector —
 * or anywhere while a native `<select>` inside it is focused with its OS list
 * open — is not outside. Presses are ignored until a microtask after arming,
 * so the press that opened the overlay does not close it.
 *
 * @param doc - The document to listen on.
 * @param insideSelector - What counts as inside.
 * @param dismiss - Close the overlay.
 * @returns The teardown.
 *
 * @public
 */
export function watchOverlayDismiss(
  doc: Document,
  insideSelector: string,
  dismiss: () => void
): () => void {
  let armed = false;
  const isInside = (target: EventTarget | null): boolean => {
    if (target instanceof Element && target.closest(insideSelector)) {
      return true;
    }
    // Native <select> lists live outside the DOM. While that list is open the
    // select stays focused inside the overlay, so a click that lands on the
    // document after picking an option is not an outside click.
    const active = doc.activeElement;
    return (
      active instanceof HTMLSelectElement &&
      active.closest(insideSelector) !== null
    );
  };
  const onPointer = (event: Event): void => {
    if (!armed || isInside(event.target)) return;
    dismiss();
  };
  const onKey = (event: KeyboardEvent): void => {
    if (event.key === "Escape") dismiss();
  };
  doc.addEventListener("mousedown", onPointer);
  doc.addEventListener("touchstart", onPointer);
  doc.addEventListener("keydown", onKey);
  queueMicrotask(() => {
    armed = true;
  });
  return () => {
    doc.removeEventListener("mousedown", onPointer);
    doc.removeEventListener("touchstart", onPointer);
    doc.removeEventListener("keydown", onKey);
  };
}

/**
 * What a header-filter overlay controller is configured with.
 *
 * @public
 */
export interface HeaderFilterOverlayOptions {
  /** The column key the overlay filters. */
  key: string;
  /** A shared open host, when the kit remounts its headers on writes. */
  host?: HeaderFilterOpenHost | null;
}

/**
 * One overlay's own state at one moment.
 *
 * @public
 */
export interface HeaderFilterOverlaySnapshot {
  /** Whether the overlay is open, when no shared host holds that. */
  readonly localOpen: boolean;
  /** Bumped on every dismissal, so the form remounts fresh. */
  readonly resetKey: number;
}

/**
 * One header filter's overlay session.
 *
 * @public
 */
export interface HeaderFilterOverlayController {
  /** The current state. A new object whenever anything in it changes. */
  readonly getSnapshot: () => HeaderFilterOverlaySnapshot;
  /** Listen for state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Replace the configuration — a binding calls this on every render. */
  readonly configure: (options: HeaderFilterOverlayOptions) => void;
  /** Open or close the overlay — through the shared host when there is one. */
  readonly setOpen: (open: boolean) => void;
  /** Close the overlay and reset its form. */
  readonly dismiss: () => void;
}

/**
 * Whether one column's overlay is open: the shared host's key decides when
 * there is a host, the overlay's own state otherwise.
 *
 * @param host - The shared open host, if any.
 * @param key - The column key.
 * @param localOpen - The overlay's own open state.
 * @returns Whether the overlay is open.
 *
 * @public
 */
export function isHeaderFilterOpen(
  host: HeaderFilterOpenHost | null | undefined,
  key: string,
  localOpen: boolean
): boolean {
  return host == null ? localOpen : host.openKey === key;
}

/**
 * Create one header filter's overlay controller.
 *
 * @param initial - The first configuration.
 * @returns The controller.
 *
 * @public
 */
export function createHeaderFilterOverlay(
  initial: HeaderFilterOverlayOptions
): HeaderFilterOverlayController {
  let options = initial;
  let snapshot: HeaderFilterOverlaySnapshot = { localOpen: false, resetKey: 0 };
  const listeners = new Set<() => void>();

  const write = (next: HeaderFilterOverlaySnapshot): void => {
    if (
      next.localOpen === snapshot.localOpen &&
      next.resetKey === snapshot.resetKey
    ) {
      return;
    }
    snapshot = next;
    for (const listener of listeners) listener();
  };

  const setOpen = (open: boolean): void => {
    const { host, key } = options;
    if (host != null) {
      host.setOpenKey(open ? key : null);
      return;
    }
    write({ ...snapshot, localOpen: open });
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    configure(next) {
      options = next;
    },
    setOpen,
    dismiss() {
      const { host } = options;
      if (host != null) host.setOpenKey(null);
      write({
        localOpen: host == null ? false : snapshot.localOpen,
        resetKey: snapshot.resetKey + 1,
      });
    },
  };
}
