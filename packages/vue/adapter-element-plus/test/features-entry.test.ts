import { it } from "vitest";

import { featuresEntryTests } from "../../vue/test/kit/featuresEntry";
import { columnMenu } from "../src/column-menu";
import { densityChooser } from "../src/density";
import { editing } from "../src/editing";
import { exportCsv } from "../src/export";
import { filters } from "../src/filters";
import * as base from "../src/index";
import { rowActions } from "../src/row-actions";
import { savedViews } from "../src/saved-views";

for (const test of featuresEntryTests({
  base,
  factories: {
    columnMenu,
    densityChooser,
    editing,
    exportCsv,
    filters,
    rowActions,
    savedViews,
  },
}))
  it(test.name, test.run);
