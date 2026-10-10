import native = require("@adapttable/vue-unstyled");
import virtual = require("@adapttable/vue-unstyled/virtualize");
import grouping = require("@adapttable/vue-unstyled/grouping-panel");
import reorder = require("@adapttable/vue-unstyled/row-reorder");
import formula = require("@adapttable/vue/formula");
import pivot = require("@adapttable/vue-unstyled/pivot");
import stream = require("@adapttable/vue/stream");
import sparkline = require("@adapttable/vue/sparkline");
import savedViews = require("@adapttable/vue-unstyled/saved-views");
import bindingFeatures = require("@adapttable/vue/features");
import nativeFeatures = require("@adapttable/vue-unstyled/features");
interface Row {
  id: string;
  team: string;
  values: readonly number[];
}
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;
const groupingTypeIsCanonical: Expect<
  Equal<nativeFeatures.GroupingExtras<Row>, bindingFeatures.GroupingExtras<Row>>
> = true;
const specialized: NonNullable<native.DataTableProps<Row>["features"]> = [
  virtual.virtualize({ maxHeight: 360 }),
  grouping.groupingPanel<Row>(["team"]),
  reorder.rowReorder<Row>(() => undefined),
];
const formulaResult = formula.buildFormulaColumns<Row>([
  { key: "twice", header: "Twice", formula: "1+1" },
]);
const chart = sparkline.sparklineColumn<Row>({
  key: "values",
  values: (row) => row.values,
});
const viewClasses: savedViews.DataTableClassNames = { viewsPanel: "views" };
const panelClasses: NonNullable<savedViews.SavedViewsPanelProps["classNames"]> =
  viewClasses;
export = {
  specialized,
  formulaResult,
  chart,
  pivot,
  stream,
  panelClasses,
  groupingTypeIsCanonical,
};
