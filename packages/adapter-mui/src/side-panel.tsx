import {
  extendFeature,
  SIDE_PANEL,
  slotRender,
  type TableFeature,
} from "@adapttable/core/adapter";
import {
  sidePanel as core,
  type SidePanelOptions,
} from "@adapttable/core/features";

import { SidePanel } from "./components/SidePanel";

/**
 * A panel docked beside the table, drawn with MUI's own surface and tabs.
 *
 * @public
 */
export function sidePanel<TRow>(options: SidePanelOptions): TableFeature<TRow> {
  return extendFeature(core<TRow>(options), [
    slotRender(SIDE_PANEL, (props) => <SidePanel {...props} />),
  ]);
}
