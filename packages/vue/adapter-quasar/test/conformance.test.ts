import {
  type ConformanceRow,
  tableConformanceTests,
} from "@adapttable/core/conformance";
import { Quasar } from "quasar";
import { describe, expect, it } from "vitest";
import { h } from "vue";

import {
  nativeConformanceDriver,
  nativeConformanceHarness,
  nativeRangeConformanceTests,
  nativeRowConformanceTests,
  nativeSearchConformanceTests,
} from "../../vue/test/nativeConformanceDriver";
import { DataTable } from "../src";
import { cellNavigation } from "../src/cell-navigation";
import { editing } from "../src/editing";
import { grouping } from "../src/grouping";
import { rowReorder } from "../src/row-reorder";
import { virtualize } from "../src/virtualize";

const driver = nativeConformanceDriver({
  name: "quasar",
  render: (props) => h(DataTable<ConformanceRow>, props),
  cellNavigation,
  editing,
  grouping,
  rowReorder,
  virtualize,
  install: (app) => {
    app.use(Quasar, { config: {} });
  },
});

describe(`table conformance — ${driver.name}`, () => {
  for (const test of tableConformanceTests(driver, {
    expect,
    ...nativeConformanceHarness,
  })) {
    it(test.name, test.run);
  }
});

describe(`native cell ranges — ${driver.name}`, () => {
  for (const test of nativeRangeConformanceTests(driver))
    it(test.name, test.run);
});

describe(`row activation and changed cells — ${driver.name}`, () => {
  for (const test of nativeRowConformanceTests(driver)) it(test.name, test.run);
});

describe(`search placeholder — ${driver.name}`, () => {
  for (const test of nativeSearchConformanceTests(driver))
    it(test.name, test.run);
});
