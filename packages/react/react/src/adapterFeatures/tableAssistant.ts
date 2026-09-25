/**
 * Bind one kit's assistant panel to the assistant slot.
 *
 * The panel is a sibling of the table, not a cell in it, so a kit exports the
 * component directly as well. This feature exists for hosts that would rather
 * compose it the way they compose every other optional part.
 */
import { createElement } from "react";

import type { TableAssistantProps } from "../assistant/TableAssistantChrome";
import { extendFeature, slotRender } from "../features/providers";
import { TABLE_ASSISTANT } from "../features/slotKeys";
import type { StaticTableFeature } from "../features/tableFeature";
import type { AdapterFeatureComponent } from "./component";

/**
 * Bind this kit's assistant panel.
 *
 * @param TableAssistant - The kit's panel component.
 * @returns The feature to compose.
 *
 * @public
 */
export function createAdapterTableAssistantFeature(
  TableAssistant: AdapterFeatureComponent<TableAssistantProps>
): StaticTableFeature {
  return extendFeature({ id: "table-assistant" }, [
    slotRender(TABLE_ASSISTANT, (props) =>
      createElement(TableAssistant, props)
    ),
  ]);
}
