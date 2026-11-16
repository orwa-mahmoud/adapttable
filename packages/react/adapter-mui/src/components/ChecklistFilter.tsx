import { createChecklistFilter } from "@adapttable/react/adapter";

import { Button, Checkbox, TextInput } from "./primitives";

export type { ChecklistFilterProps } from "@adapttable/react/adapter";
/**
 * MUI checklist — wrapping kit checkboxes, not one value per row.
 *
 * @public
 */
export const ChecklistFilter = /* @__PURE__ */ createChecklistFilter(
  { TextInput, Button, Checkbox },
  { checkbox: { flex: "0 0 auto", marginRight: 0, width: "auto" } }
);
