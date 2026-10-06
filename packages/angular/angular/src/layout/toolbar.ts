/**
 * The toolbar's optional controls, as signals: row density kept in the URL,
 * the fullscreen toggle, and CSV export — each over core's model.
 */
import {
  densitySlice,
  type TableDensity,
  type UrlStateAdapter,
} from "@adapttable/core";
import type { FullscreenState } from "@adapttable/core/binding";
import { DOCUMENT } from "@angular/common";
import {
  assertInInjectionContext,
  computed,
  effect,
  inject,
  Injector,
  type Signal,
  signal,
} from "@angular/core";

import { onBrowser } from "../hooks/platform";
import { injectUrlSlice } from "../url/urlSlice";

/**
 * Options for {@link injectDensity}.
 *
 * @public
 */
export interface DensityOptions {
  /** URL-state backend. Chosen once when this slice is created. */
  readonly urlAdapter?: UrlStateAdapter;
  /** Keep this slice in the URL. Chosen once when it is created. */
  readonly urlSync?: boolean;
  /** URL namespace. Chosen once when this slice is created. */
  readonly urlKey?: string;
  /** The density while the URL says nothing. Defaults to comfortable. */
  readonly defaultDensity?: TableDensity;
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * Row density, kept in the URL beside the table's other view state.
 *
 * @public
 */
export interface DensityState {
  /** The current density. */
  readonly density: Signal<TableDensity>;
  /** Change it. */
  readonly setDensity: (next: TableDensity) => void;
}

/**
 * Row density in the URL.
 *
 * @param options - See {@link DensityOptions}.
 * @returns See {@link DensityState}.
 *
 * @public
 */
export function injectDensity(options: DensityOptions = {}): DensityState {
  if (!options.injector) assertInInjectionContext(injectDensity);
  const injector = options.injector ?? inject(Injector);
  const slice = injectUrlSlice({ ...options, injector }, densitySlice, {
    defaultDensity: options.defaultDensity,
  });
  return { density: slice.value, setDensity: slice.set };
}

/**
 * Fullscreen for one element: whether it is fullscreen, whether the browser
 * allows it, and the toggle. The document is the source of truth, so Escape
 * and the browser's own control are followed too.
 *
 * @param element - The element to take fullscreen.
 * @param injector - The injector to run in. Omit inside an injection context.
 * @returns The state, as a signal.
 *
 * @public
 */
export function injectFullscreen(
  element: Signal<HTMLElement | undefined>,
  injector?: Injector
): Signal<FullscreenState> {
  if (!injector) assertInInjectionContext(injectFullscreen);
  const context = injector ?? inject(Injector);
  const doc = context.get(DOCUMENT);
  const supported = onBrowser(context) && doc.fullscreenEnabled;
  const active = signal(false);
  effect(
    (onCleanup) => {
      const target = element();
      if (!supported) return;
      const sync = (): void => {
        active.set(target !== undefined && doc.fullscreenElement === target);
      };
      sync();
      doc.addEventListener("fullscreenchange", sync);
      onCleanup(() => {
        doc.removeEventListener("fullscreenchange", sync);
      });
    },
    { injector: context }
  );
  const exit = (): void => {
    if (doc.fullscreenElement) void doc.exitFullscreen();
  };
  const toggle = (): void => {
    const target = element();
    if (!supported || !target) return;
    if (doc.fullscreenElement === target) {
      void doc.exitFullscreen();
      return;
    }
    // A browser refuses fullscreen a real gesture did not ask for; that is
    // not an error worth throwing at the host.
    target.requestFullscreen().catch(() => undefined);
  };
  return computed(() => {
    const target = element();
    return {
      active: active(),
      supported,
      toggle,
      exit,
      container: active() && target ? target : undefined,
    };
  });
}

export {
  type ExportCsvHandlerOptions,
  injectExportCsv,
  injectExportHandler,
} from "../export/exportHandler";
