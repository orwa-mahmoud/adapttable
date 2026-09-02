import { createElement } from "react";

import { extendFeature, slotRender } from "../features/providers";
import { rowReorder as coreRowReorder } from "../features/row-reorder";
import {
  ROW_REORDER_ANNOUNCER,
  ROW_REORDER_BUTTONS,
  ROW_REORDER_HANDLE,
} from "../features/slotKeys";
import type { TableFeature } from "../features/tableFeature";
import type { RowReorderOptions } from "../rows/rowMove";
import type { RowReorderHandler } from "../rows/rowReorder";
import {
  RowReorderAnnouncer,
  type RowReorderButtonsProps,
  type RowReorderHandleProps,
} from "../rows/RowReorderHandle";
import type { AdapterFeatureComponent } from "./component";

/**
 * Kit renderers for pointer and keyboard row reordering.
 *
 * @public
 */
export interface AdapterRowReorderComponents {
  /** Desktop drag handle. */
  readonly RowReorderHandle: AdapterFeatureComponent<
    RowReorderHandleProps<never>
  >;
  /** Mobile move-up and move-down controls. */
  readonly RowReorderButtons: AdapterFeatureComponent<
    RowReorderButtonsProps<never>
  >;
}

/**
 * A row-reorder factory bound to one kit's controls.
 *
 * @public
 */
export type AdapterRowReorderFeature = <TRow>(
  onRowReorder: RowReorderHandler<TRow>,
  options?: RowReorderOptions<TRow>
) => TableFeature<TRow>;

/**
 * Bind core's reorder state machine to kit-owned pointer and keyboard controls.
 *
 * @public
 */
export function createAdapterRowReorderFeature(
  components: AdapterRowReorderComponents
): AdapterRowReorderFeature {
  const renders = [
    slotRender(ROW_REORDER_HANDLE, (props) =>
      createElement(components.RowReorderHandle, props)
    ),
    slotRender(ROW_REORDER_BUTTONS, (props) =>
      createElement(components.RowReorderButtons, props)
    ),
    slotRender(ROW_REORDER_ANNOUNCER, (props) =>
      createElement(RowReorderAnnouncer, props)
    ),
  ];

  return <TRow>(
    onRowReorder: RowReorderHandler<TRow>,
    options?: RowReorderOptions<TRow>
  ): TableFeature<TRow> =>
    extendFeature(coreRowReorder(onRowReorder, options), renders);
}
