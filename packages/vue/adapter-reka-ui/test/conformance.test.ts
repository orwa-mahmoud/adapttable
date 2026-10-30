import {
  type ConformanceRow,
  tableConformanceTests,
} from "@adapttable/core/conformance";
import { describe, expect, it } from "vitest";
import { h } from "vue";

import {
  nativeConformanceDriver,
  nativeConformanceHarness,
  nativeRangeConformanceTests,
  nativeRowConformanceTests,
} from "../../vue/test/nativeConformanceDriver";
import { DataTable } from "../src";
import { cellNavigation } from "../src/cell-navigation";
import { editing } from "../src/editing";
import { grouping } from "../src/grouping";
import { rowReorder } from "../src/row-reorder";
import { virtualize } from "../src/virtualize";

const driver = nativeConformanceDriver({
  name: "reka-ui",
  render: (props) => h(DataTable<ConformanceRow>, props),
  cellNavigation,
  editing,
  grouping,
  rowReorder,
  virtualize,
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
