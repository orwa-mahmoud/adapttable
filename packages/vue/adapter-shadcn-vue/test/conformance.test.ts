import { describe, it } from "vitest";
import { h } from "vue";

import {
  type ConformanceRow,
  nativeConformanceDriver,
  nativeRangeConformanceTests,
  nativeRowConformanceTests,
  nativeSearchConformanceTests,
  nativeServerConformanceTests,
  nativeTableConformanceTests,
} from "../../vue/test/nativeConformanceDriver";
import { DataTable } from "../src";
import { cellNavigation } from "../src/cell-navigation";
import { editing } from "../src/editing";
import { grouping } from "../src/grouping";
import { rowReorder } from "../src/row-reorder";
import { selection } from "../src/selection";
import { virtualize } from "../src/virtualize";

const driver = nativeConformanceDriver({
  name: "shadcn-vue",
  render: (props) => h(DataTable<ConformanceRow>, props),
  cellNavigation,
  editing,
  grouping,
  rowReorder,
  selection,
  virtualize,
});

describe(`table conformance — ${driver.name}`, () => {
  for (const test of nativeTableConformanceTests(driver))
    it(test.name, test.run);
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

describe(`server tier and query notices — ${driver.name}`, () => {
  for (const test of nativeServerConformanceTests(driver))
    it(test.name, test.run);
});
