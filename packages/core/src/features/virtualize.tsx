/**
 * Row (and optional column) virtualization — `@adapttable/<kit>/virtualize`.
 *
 * The factory and the TanStack-backed body live together on this entry, so a
 * table that never imports it never carries `@tanstack/react-virtual`. The
 * body mounts in-tree through {@link CHROME_BODY}; the base graph never
 * reaches the hooks.
 */
import type { ReactNode } from "react";

import { useKeyedVirtualization } from "../virtual/useTableVirtualization";
import { useVirtualChromeBodyData } from "../virtual/useVirtualChromeBodyData";
import { slotRender } from "./providers";
import {
  CHROME_BODY,
  type ChromeBodySlotProps,
  KEYED_WINDOW,
  type KeyedWindowSlotProps,
} from "./slotKeys";
import type { FeaturePatch, TableFeature } from "./tableFeature";

/** Options the factory accepts — a boolean or the windowing knobs. */
export type VirtualizeOptions =
  | boolean
  | {
      virtualizeColumns?: boolean;
      estimateRowSize?: number;
      estimateCardSize?: number;
      virtualOverscan?: number;
      virtualScrollMargin?: number;
    };

function patchOf(options: VirtualizeOptions): FeaturePatch<never> {
  if (options === true || options === false) {
    return { virtualize: options };
  }
  return { virtualize: true, ...options };
}

/**
 * The in-tree body that calls TanStack. Mounted only when this feature
 * fills {@link CHROME_BODY}.
 */
function VirtualChromeBody({
  chrome,
  props,
  children,
}: ChromeBodySlotProps<never>): ReactNode {
  const body = useVirtualChromeBodyData(chrome, props);
  return children(body);
}

/**
 * The keyed window a kit that assembles its own body asks for. Mounted only
 * when this feature fills {@link KEYED_WINDOW}.
 */
function KeyedWindow({
  children,
  ...options
}: KeyedWindowSlotProps): ReactNode {
  return children(useKeyedVirtualization(options));
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
export function virtualize<TRow>(
  options: VirtualizeOptions = true
): TableFeature<TRow> {
  const patch = patchOf(options);
  return {
    id: "virtualize",
    apply: () => patch,
    renders: [
      slotRender(CHROME_BODY, (slotProps) => (
        <VirtualChromeBody {...slotProps} />
      )),
      slotRender(KEYED_WINDOW, (slotProps) => <KeyedWindow {...slotProps} />),
    ],
  };
}
