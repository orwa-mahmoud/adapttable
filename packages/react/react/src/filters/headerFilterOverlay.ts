/**
 * Header-filter overlay session — the React binding.
 *
 * Core's overlay model owns the session: the overlay stays open while the
 * field is incomplete, ignores nested kit dropdowns as "outside", and
 * optionally dismisses once a complete value is written (`closeOnSelect`).
 * This module holds the shared open state in React context for kits whose
 * headers remount on writes, and wires the model to React.
 */
import {
  bindHeaderFilterDismiss as bindNeutralDismiss,
  createHeaderFilterOverlay,
  type FilterDef,
  type FilterTypeRegistry,
  HEADER_FILTER_SESSION_ATTR,
  headerFilterInsideSelector,
  type HeaderFilterOpenHost,
  isHeaderFilterOpen,
  watchOverlayDismiss,
} from "@adapttable/core";
import {
  createContext,
  createElement,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import type { FilterFormSource } from "./filterForm";

export {
  headerFilterFieldIsComplete,
  type HeaderFilterOpenHost,
  HEADER_FILTER_SESSION_ATTR as SESSION_ATTR,
} from "@adapttable/core";

/**
 * Props that keep one header filter's overlay session together.
 *
 * @public
 */
export interface HeaderFilterSessionProps {
  /** Ties the trigger and its overlay to one editing session. */
  readonly [HEADER_FILTER_SESSION_ATTR]: string;
}

/**
 * Context filled by {@link HeaderFilterOpenProvider}.
 *
 * @public
 */
export const HeaderFilterOpenContext =
  createContext<HeaderFilterOpenHost | null>(null);

/**
 * Hold header-filter open state above kit headers that remount on writes.
 *
 * @public
 */
export function HeaderFilterOpenProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactNode {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const value = useMemo(() => ({ openKey, setOpenKey }), [openKey]);
  return createElement(HeaderFilterOpenContext.Provider, { value }, children);
}

/**
 * Wrap a filter source so a complete write can dismiss the overlay.
 * Off unless `closeOnSelect` is true — the default is stay open.
 *
 * @public
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
  return bindNeutralDismiss(source, options);
}

/**
 * Dismiss on a true outside press or Escape. Nested kit dropdowns (and a
 * focused native `<select>` whose OS list is open) are not outside.
 *
 * @public
 */
export function usePointerDismiss(
  open: boolean,
  dismiss: () => void,
  insideSelector: string
): void {
  useEffect(() => {
    if (!open) return undefined;
    return watchOverlayDismiss(document, insideSelector, dismiss);
  }, [open, dismiss, insideSelector]);
}

/**
 * Open state + a source that honours {@link bindHeaderFilterDismiss}.
 *
 * @public
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
  const persistKey = props.def.key;
  const host = useContext(HeaderFilterOpenContext);
  const [controller] = useState(() =>
    createHeaderFilterOverlay({ key: persistKey, host })
  );
  controller.configure({ key: persistKey, host });
  const { localOpen, resetKey } = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  const open = isHeaderFilterOpen(host, persistKey, localOpen);
  const source = bindHeaderFilterDismiss(props.source, {
    def: props.def,
    closeOnSelect: props.closeOnSelect === true,
    dismiss: controller.dismiss,
    registry: props.registry,
  });
  usePointerDismiss(
    open && options?.pointerDismiss !== false,
    controller.dismiss,
    headerFilterInsideSelector({
      sessionId: id,
      sharedHost: host != null,
      nestedSelector: options?.nestedSelector,
    })
  );
  return {
    open,
    setOpen: controller.setOpen,
    source,
    sessionProps: { [HEADER_FILTER_SESSION_ATTR]: id },
    resetKey,
  };
}
