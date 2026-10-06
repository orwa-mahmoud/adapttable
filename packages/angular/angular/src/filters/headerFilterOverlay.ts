/**
 * One header filter's overlay session: which column is open, when a finished
 * write dismisses it, and what counts as a press outside it.
 *
 * Core owns the session. This wires that controller to signals, including a
 * shared open host for a kit that remounts its headers on every write.
 */
import {
  bindHeaderFilterDismiss,
  createHeaderFilterOverlay,
  type FilterDef,
  type FilterFormSource,
  type FilterTypeRegistry,
  headerFilterInsideSelector,
  type HeaderFilterOpenHost,
  isHeaderFilterOpen,
  watchOverlayDismiss,
} from "@adapttable/core";
import { computed, effect, inject, Injector, type Signal } from "@angular/core";

import { onBrowser } from "../hooks/platform";
import { fromStore, type MaybeSignal, readMaybe } from "../store";

let nextSession = 0;

/** A fresh id that marks what counts as inside one header filter. */
function sessionId(): string {
  nextSession += 1;
  return `hf-${String(nextSession)}`;
}

/** The current value of an optional signal or plain value. */
function readOptional<T>(value: MaybeSignal<T> | undefined): T | undefined {
  if (value === undefined) return undefined;
  return readMaybe(value);
}

/**
 * Open state for one header filter, plus a source that can dismiss the
 * overlay after a finished single-control write.
 *
 * Call it from a component. The definition and the source may be inputs:
 * nothing is read until the overlay is. `closeOnSelect` stays off unless it
 * is true. An outside press or Escape dismisses it; a nested kit dropdown
 * named in `nestedSelector` does not. Pass `pointerDismiss: false` when the
 * kit closes the overlay itself.
 *
 * @param props - The column's definition, the filter source, and whether a
 *   finished write closes the overlay.
 * @param options - The shared open host, what else counts as inside, and
 *   whether a press outside dismisses.
 * @returns The open signal, the writer, the wrapped source, the session id
 *   and the reset key.
 *
 * @public
 */
export function injectHeaderFilterOverlay<TRow>(
  props: {
    readonly def: MaybeSignal<FilterDef<TRow>>;
    readonly source: MaybeSignal<FilterFormSource<TRow>>;
    readonly closeOnSelect?: MaybeSignal<boolean>;
    readonly registry?: MaybeSignal<FilterTypeRegistry>;
  },
  options?: {
    readonly nestedSelector?: MaybeSignal<string>;
    readonly pointerDismiss?: MaybeSignal<boolean>;
    readonly host?: MaybeSignal<HeaderFilterOpenHost | null>;
    readonly injector?: Injector;
  }
): {
  readonly open: Signal<boolean>;
  readonly setOpen: (open: boolean) => void;
  readonly source: Signal<FilterFormSource<TRow>>;
  readonly sessionId: string;
  readonly resetKey: Signal<number>;
} {
  const injector = options?.injector ?? inject(Injector);
  const id = sessionId();
  const controller = createHeaderFilterOverlay({ key: "" });
  const snapshot = fromStore(controller, { injector });

  const sync = (): HeaderFilterOpenHost | null => {
    const host = readOptional(options?.host) ?? null;
    controller.configure({ key: readMaybe(props.def).key, host });
    return host;
  };

  const open = computed(() => {
    const host = readOptional(options?.host) ?? null;
    return isHeaderFilterOpen(
      host,
      readMaybe(props.def).key,
      snapshot().localOpen
    );
  });

  const source = computed(() => {
    const def = readMaybe(props.def);
    sync();
    return bindHeaderFilterDismiss(readMaybe(props.source), {
      def,
      closeOnSelect: readOptional(props.closeOnSelect) === true,
      dismiss: controller.dismiss,
      registry: readOptional(props.registry),
    });
  });

  effect(
    (onCleanup) => {
      const host = sync();
      const watch = readOptional(options?.pointerDismiss) !== false;
      if (!onBrowser(injector) || !watch || !open()) return;
      onCleanup(
        watchOverlayDismiss(
          document,
          headerFilterInsideSelector({
            sessionId: id,
            sharedHost: host != null,
            nestedSelector: readOptional(options?.nestedSelector),
          }),
          controller.dismiss
        )
      );
    },
    { injector }
  );

  return {
    open,
    setOpen: (next) => {
      sync();
      controller.setOpen(next);
    },
    source,
    sessionId: id,
    resetKey: computed(() => snapshot().resetKey),
  };
}
