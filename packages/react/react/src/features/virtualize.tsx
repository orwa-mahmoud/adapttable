/**
 * Row (and optional column) virtualization — `@adapttable/<kit>/virtualize`.
 *
 * The factory and the TanStack-backed body live together on this entry, so a
 * table that never imports it never carries `@tanstack/react-virtual`. The
 * body mounts in-tree through {@link CHROME_BODY}; the base graph never
 * reaches the hooks.
 */
import { coreVirtualize } from "@adapttable/core/binding";
import type { ReactNode } from "react";

import { RowScrollContext } from "../virtual/rowScroll";
import { useKeyedVirtualizer } from "../virtual/useTableVirtualization";
import { useVirtualChromeBody } from "../virtual/useVirtualChromeBodyData";
import { slotRender } from "./providers";
import {
  CHROME_BODY,
  type ChromeBodyDraw,
  type ChromeBodySlotProps,
  KEYED_WINDOW,
  type KeyedWindowSlotProps,
} from "./slotKeys";
import type { StaticTableFeature } from "./tableFeature";

/**
 * Options the factory accepts — a boolean or the windowing knobs.
 *
 * @public
 */
export type VirtualizeOptions =
  | boolean
  | {
      virtualizeColumns?: boolean;
      estimateRowSize?: number;
      estimateCardSize?: number;
      virtualOverscan?: number;
      virtualScrollMargin?: number;
    };

/**
 * The in-tree body that calls TanStack. Mounted only when this feature
 * fills {@link CHROME_BODY}.
 */
function VirtualChromeBody<TRow>({
  chrome,
  props,
  children,
}: Readonly<ChromeBodySlotProps<TRow>>): ReactNode {
  const { body, scrollToRow } = useVirtualChromeBody(chrome, props);
  return (
    <RowScrollContext.Provider value={scrollToRow}>
      {children(body)}
    </RowScrollContext.Provider>
  );
}

/**
 * The keyed window a kit that assembles its own body asks for. Mounted only
 * when this feature fills {@link KEYED_WINDOW}.
 */
function KeyedWindow({
  children,
  ...options
}: KeyedWindowSlotProps): ReactNode {
  const { virtualization, scrollToIndex } = useKeyedVirtualizer(options);
  return children({ ...virtualization, scrollToIndex });
}

/**
 * Render only the rows in view.
 *
 * ```tsx
 * import { virtualize } from "@adapttable/mui/virtualize";
 *
 * <DataTable features={[virtualize()]} paginationMode="infinite" … />
 * ```
 *
 * @public
 */
export function virtualize(
  options: VirtualizeOptions = true
): StaticTableFeature {
  return {
    ...coreVirtualize(options),
    renders: [
      slotRender<ChromeBodyDraw>(CHROME_BODY, (slotProps) => (
        <VirtualChromeBody {...slotProps} />
      )),
      slotRender(KEYED_WINDOW, (slotProps) => <KeyedWindow {...slotProps} />),
    ],
  };
}
