/** Bind a kit's assistant without bringing an AI runtime into the binding. */
import { slotRender, TABLE_ASSISTANT } from "@adapttable/core/binding";
import type { Type } from "@angular/core";

import { type AdaptTableFeature, extendFeature } from "../featureHost";
/** Compose this kit's assistant slot. @public */
export function createAdapterTableAssistantFeature(
  component: Type<unknown>
): AdaptTableFeature {
  return extendFeature({ id: "table-assistant" }, [
    slotRender(TABLE_ASSISTANT, () => component),
  ]);
}
