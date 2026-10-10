import { slotRender } from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import { effectScope, shallowRef } from "vue";

import { BULK_ACTIONS_MODEL, SIDE_PANEL_MODEL } from "../src/actions/contracts";
import { bulkActions } from "../src/bulk-actions";
import { commandPalette } from "../src/command-palette";
import { contextMenu } from "../src/context-menu";
import { exportCsv } from "../src/export-csv";
import { exportPdf } from "../src/export-pdf";
import { exportXlsx } from "../src/export-xlsx";
import { extendFeature, type TableFeature } from "../src/features/tableFeature";
import { useRowSelection } from "../src/selection/selection";
import { sidePanel } from "../src/side-panel";
import { useDataTableShell } from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
}
const base = {
  data: [{ id: "a", name: "Ada" }],
  columns: [{ key: "name" }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
};
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing action model");
  return value;
}
function fill(feature: TableFeature<Row>): TableFeature<Row> {
  return extendFeature(
    feature,
    (feature.requiredSlots ?? []).map((slot) => slotRender(slot, () => null))
  );
}
describe("UI-free action model ownership and required slots", () => {
  it.each([
    bulkActions([]),
    commandPalette(),
    contextMenu<Row>(),
    exportCsv<Row>(),
    exportPdf<Row>(),
    exportXlsx<Row>(),
    sidePanel({ panels: [], open: null, onOpenChange: vi.fn() }),
  ])("rejects an unfilled $id feature", (feature) => {
    const scope = effectScope();
    try {
      expect(() =>
        scope.run(() => useDataTableShell({ ...base, features: [feature] }))
      ).toThrow("requires the adapter control slot");
    } finally {
      scope.stop();
    }
  });
  it("composes registered panels through neutral key precedence and keeps retained changes inactive", () => {
    const change = vi.fn();
    const scope = effectScope();
    const features = shallowRef<TableFeature<Row>[]>([
      fill(
        sidePanel({
          panels: [{ key: "same", label: "Original", content: "old" }],
          open: "same",
          onOpenChange: change,
        })
      ),
      {
        id: "registered-panel",
        setup: (host) => {
          const registered = { key: "same", label: "Override", content: "new" };
          host.registerPanel(registered);
          host.registerPanel({ key: "anonymous" });
        },
      },
    ]);
    const shell = required(
      scope.run(() => useDataTableShell({ ...base, features }))
    );
    const model = required(shell.state.get(SIDE_PANEL_MODEL).value);
    expect(model.panels.map((panel) => panel.label)).toEqual([
      "Override",
      "anonymous",
    ]);
    expect(model.panels[0]?.content).toBe("new");
    model.onOpenChange("anonymous");
    expect(change).toHaveBeenLastCalledWith("anonymous");
    features.value = [features.value[0]].filter(
      (feature): feature is TableFeature<Row> => feature !== undefined
    );
    expect(shell.state.get(SIDE_PANEL_MODEL).value?.panels).toHaveLength(1);
    scope.stop();
    model.onOpenChange(null);
    expect(change).toHaveBeenCalledOnce();
  });
  it("refuses disabled/stale bulk callbacks and never accepts confirmation after disposal", () => {
    const run = vi.fn();
    let accept: (() => void) | undefined;
    const scope = effectScope();
    const action = {
      key: "run",
      label: "Run",
      onClick: run,
      confirm: { title: "Run", message: () => "Confirm", confirmLabel: "Run" },
    };
    const other = {
      key: "other",
      label: "Disabled",
      onClick: run,
      disabledReason: () => "Not allowed",
    };
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          ...base,
          selectable: true,
          defaultSelectedIds: ["a"],
          confirm: (request) => {
            accept = request.onConfirm;
          },
          features: [fill(bulkActions([action, other]))],
        })
      )
    );
    const model = required(shell.state.get(BULK_ACTIONS_MODEL).value);
    model.run(other);
    expect(run).not.toHaveBeenCalled();
    model.run({ ...action });
    expect(accept).toBeUndefined();
    model.run(action);
    expect(accept).toBeTypeOf("function");
    scope.stop();
    accept?.();
    model.run(action);
    model.clear();
    model.selectAllMatching();
    expect(run).not.toHaveBeenCalled();
  });
  it("requires a host confirmer and makes bulk controls absent without selection", () => {
    const action = {
      key: "run",
      label: "Run",
      onClick: vi.fn(),
      confirm: { title: "Run", message: () => "Confirm", confirmLabel: "Run" },
    };
    const scope = effectScope();
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          ...base,
          selectable: true,
          defaultSelectedIds: ["a"],
          features: [fill(bulkActions([action]))],
        })
      )
    );
    expect(() =>
      required(shell.state.get(BULK_ACTIONS_MODEL).value).run(action)
    ).toThrow("host confirm handler");
    scope.stop();
    const other = effectScope();
    const noSelection = required(
      other.run(() =>
        useDataTableShell({ ...base, features: [fill(bulkActions([action]))] })
      )
    );
    expect(noSelection.state.get(BULK_ACTIONS_MODEL).value).toBeUndefined();
    other.stop();
  });
  it("narrows the neutral all-matching scope when a replacement source cannot span pages", () => {
    const scope = effectScope();
    const acrossPages = shallowRef(true);
    const changed = vi.fn();
    const selection = required(
      scope.run(() =>
        useRowSelection({
          rows: base.data,
          rowKey: base.rowKey,
          defaultSelectedIds: ["a"],
          acrossPages,
          onSelectionChange: changed,
        })
      )
    );
    selection.selectAllMatching();
    expect(selection.allMatching.value).toBe(true);
    acrossPages.value = false;
    expect(selection.allMatching.value).toBe(false);
    expect([...selection.selectedIds.value]).toEqual(["a"]);
    expect(changed).not.toHaveBeenCalled();
    selection.selectAllMatching();
    expect(selection.allMatching.value).toBe(false);
    scope.stop();
  });
});
