import { expect, it } from "vitest";

import { columnSelectionCheckbox as legacyColumnSelection } from "../src/cell-navigation";
import { columnSelectionCheckbox } from "../src/column-selection";
import { nestedTable } from "../src/nested-table";
import { nestedTable as legacyNestedTable } from "../src/row-detail";

it("publishes canonical feature paths without replacing existing aliases", () => {
  expect(columnSelectionCheckbox).toBe(legacyColumnSelection);
  expect(nestedTable).toBe(legacyNestedTable);
});
