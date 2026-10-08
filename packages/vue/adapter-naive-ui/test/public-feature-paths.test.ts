import { expect, it } from "vitest";

import { columnSelectionCheckbox as legacyColumnSelection } from "../src/cell-navigation";
import { columnSelectionCheckbox } from "../src/column-selection";

it("publishes the canonical selection path without replacing its existing alias", () => {
  expect(columnSelectionCheckbox).toBe(legacyColumnSelection);
});
