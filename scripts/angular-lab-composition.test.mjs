/** Source wiring checks; runtime conformance remains in the Angular browser suite. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
const source = readFileSync(
  new URL("../apps/showcase/src/angular/demoPage.ts", import.meta.url),
  "utf8"
);
const template = readFileSync(
  new URL("../apps/showcase/src/angular/demoPage.html", import.meta.url),
  "utf8"
);
it("composes the lab through real selected-kit factories", () => {
  for (const factory of [
    "editing",
    "rowEditing",
    "batchEditing",
    "nestedTable",
    "tree",
    "groupingPanel",
    "rowActions",
    "rowReorder",
    "rowPinning",
    "pinnedSummaryRows",
    "cellSpan",
    "extraRows",
    "rowAppearance",
    "statusBar",
    "sidePanel",
    "contextMenu",
    "commandPalette",
    "print",
    "columnSelectionCheckbox",
    "fullscreen",
    "pivotTableModel",
  ])
    assert.match(source, new RegExp(`this\\.kit\\.${factory}\\b`), factory);
  assert.doesNotMatch(
    source,
    /from ["'](?:react|@adapttable\/react|@mantine\/)/
  );
});
it("keeps all recipes and real formula/sparkline/editor composition", () => {
  for (const recipe of ["baseline", "filters", "structure", "editing", "rows"])
    assert.ok(source.includes(`"${recipe}"`), recipe);
  assert.match(source, /buildFormulaColumns<Person>/);
  assert.match(source, /sparklineColumn<Person>/);
  assert.match(source, /editor: "boolean"/);
  assert.match(source, /type: "multi-select"/);
});
it("renders the composed pivot and panel without substituting a focused example", () => {
  assert.match(template, /@else if \(pivoted\(\)\)/);
  assert.match(template, /\[data\]="table.rows"/);
  assert.match(template, /\[features\]="panelFeatures\(\)"/);
  assert.match(template, /\[ngComponentOutlet\]="kit.savedViewsPanel"/);
  assert.match(template, /\[features\]="features\(\)"/);
});
it("gives failures a recovery path and incompatible options an explanation", () => {
  assert.match(template, /\(click\)="retry\(\)"/);
  assert.match(source, /this.failure.set\("off"\)/);
  assert.match(template, /\[disabled\]="!!reason\(toggle\[0\]\)"/);
  assert.match(template, /\[title\]="reason\(toggle\[0\]\) \?\? ''"/);
  assert.match(source, /movePolicy: "confirm"/);
});
