import {
  type ChecklistFilterProps,
  createChecklistFilter,
} from "@adapttable/react/adapter";

import { Button, Checkbox, TextInput } from "./kitPrimitives";

export type { ChecklistFilterProps };

/**
 * Ant Design checklist — wrapping kit checkboxes, not one value per row.
 *
 * @public
 */
export const ChecklistFilter = /* @__PURE__ */ createChecklistFilter(
  { TextInput, Button, Checkbox },
  { checkbox: { display: "inline-flex", alignItems: "center" } }
);
