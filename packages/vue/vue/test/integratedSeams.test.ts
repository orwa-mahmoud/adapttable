import { resolveLabels } from "@adapttable/core";
import {
  ACTIVE_FILTER_CHIPS,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";

import { type ColumnDef } from "../src/columnDef";
import {
  editableCellSlotKey,
  editableCustomControl,
  editing,
  rowEditActionsSlotKey,
  rowEditing,
  undoRedoButtons,
  useEditableCellModel,
  useTableEditing,
} from "../src/editing";
import { grouping } from "../src/features/grouping";
import { pinnedSummaryRows } from "../src/features/headlessFactories";
import { rowDetail } from "../src/features/rowDetail";
import {
  type ComposedFeature,
  extendFeature,
} from "../src/features/tableFeature";
import {
  FilterPanelChrome,
  type FilterPanelSlots,
  filters,
  filterViewKey,
} from "../src/filters";
import {
  useDataTableShell,
  type UseDataTableShellResult,
} from "../src/useDataTableShell";
import { FULLSCREEN_MODEL } from "../src/viewControls/contracts";
import { nativeDensity, nativeSavedViews } from "./fixtures/viewControls";
interface Row {
  id: string;
  name: string;
  team: string;
}
const row: Row = { id: "a", name: "Ada", team: "Core" };
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", editable: true },
  { key: "team" },
];
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing fixture value");
  return value;
}
describe("integrated optional feature seams", () => {
  it("requires the advanced tree slot and forwards the active fullscreen container", () => {
    const scope = effectScope();
    const declarations = shallowRef<readonly ComposedFeature<Row>[]>([
      extendFeature(
        filters<Row>([{ key: "name", type: "text" }], { tree: true }),
        [
          slotRender(TOOLBAR_EXTRAS, () => null),
          slotRender(ACTIVE_FILTER_CHIPS, () => null),
        ]
      ),
    ]);
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data: [row],
          columns,
          rowKey: (value: Row) => value.id,
          features: declarations,
          urlSync: false,
        })
      )
    );
    const model = () => required(shell.state.get(filterViewKey<Row>()).value);
    const controls: FilterPanelSlots<Row> = {
      Trigger: () => null,
      Button: () => null,
      Field: () => null,
      Popover: () => null,
      Drawer: () => null,
    };
    expect(() => FilterPanelChrome({ model: model(), controls })).toThrow(
      "Tree"
    );
    const tree = vi.fn(() => null);
    const surface = vi.fn(() => null);
    const container = document.createElement("div");
    shell.state.set(FULLSCREEN_MODEL, {
      active: false,
      supported: true,
      container,
      toggle: () => undefined,
      exit: () => undefined,
    });
    FilterPanelChrome({
      model: model(),
      controls: { ...controls, Tree: tree, Popover: surface },
    });
    expect(tree).toHaveBeenCalledWith(
      expect.objectContaining({ source: shell.table.source.value })
    );
    expect(surface).toHaveBeenCalledWith(
      expect.objectContaining({ container })
    );
    const retained = model();
    shell.source.value.setExtra("name", "Ada");
    declarations.value = [];
    retained.clear();
    retained.trigger.onPointerDown();
    retained.trigger.onClick();
    retained.close();
    retained.trigger.triggerRef(container);
    expect(shell.source.value.extra.name).toBe("Ada");
    expect(shell.state.get(filterViewKey<Row>()).value).toBeUndefined();
    scope.stop();
  });
  it("shares grouped row editing, summary selection geometry and open details", async () => {
    const scope = effectScope();
    const save = vi.fn();
    const edit = extendFeature(rowEditing<Row>(save), [
      slotRender(editableCellSlotKey<Row>(), () => null),
      slotRender(rowEditActionsSlotKey<Row>(), () => null),
    ]);
    const features = shallowRef<readonly ComposedFeature<Row>[]>([
      grouping<Row>("team"),
      edit,
      rowDetail<Row>((value) => h("span", value.name), ["a"]),
      pinnedSummaryRows<Row>({
        top: [{ id: "total", name: "Total", team: "" }],
      }),
    ]);
    const shell = required(
      scope.run(() =>
        useDataTableShell({
          data: [row],
          columns,
          rowKey: (value: Row) => value.id,
          features,
          selectable: true,
          urlSync: false,
        })
      )
    );
    expect(shell.desktop.value.columnCount).toBe(5);
    expect(shell.desktop.value.expandLabel).toBe(
      shell.table.labels.value.expandRow
    );
    const slots = required(shell.desktop.value.bodySlots);
    const summary = slots.find(
      (slot) => slot.kind === "row" && slot.wiring.summary
    );
    expect(summary?.kind).toBe("row");
    const data = slots.find(
      (slot) => slot.kind === "row" && slot.wiring.row.id === "a"
    );
    if (data?.kind !== "row") throw new Error("Missing data row");
    expect(data.wiring.detail?.expanded).toBe(true);
    expect(data.wiring.editActions).toBeTypeOf("function");
    const model = required(shell.editing.value?.rowEditing);
    model.begin(row, "a");
    model.setDraft("name", "Grace");
    model.save();
    await nextTick();
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith(row, { name: "Grace" });
    features.value = [];
    model.begin(row, "a");
    expect(shell.editing.value).toBeUndefined();
    expect(shell.grouping.value).toBeUndefined();
    expect(shell.detail.value).toBeUndefined();
    expect(shell.desktop.value.expandLabel).toBeUndefined();
    expect(shell.desktop.value.columnCount).toBe(3);
    scope.stop();
  });
  it("projects custom editors from one model and delegates neutral key/focus handlers", () => {
    const scope = effectScope();
    const save = vi.fn();
    const model = required(
      scope.run(() => {
        const table = useTableEditing({
          rows: [row],
          columns,
          rowKey: (value) => value.id,
          onCellEdit: save,
        });
        return useEditableCellModel<Row>(() => ({
          editing: table.bundle.value,
          row,
          rowId: "a",
          rowIndex: 0,
          rows: [row],
          columns,
          rowKey: (value) => value.id,
          column: required(columns[0]),
          display: row.name,
          editLabel: "Edit name",
        }));
      })
    );
    model.value.controller.begin();
    let control = editableCustomControl(model.value);
    const focus = vi.fn();
    control.focusRef({ focus });
    expect(focus).toHaveBeenCalled();
    control.setDraft("Grace");
    control = editableCustomControl(model.value);
    expect(control.draft).toBe("Grace");
    expect(control.errorId).toBe(model.value.errorId);
    const preventDefault = vi.fn();
    control.onKeyDown({ key: "Enter", preventDefault });
    expect(save).toHaveBeenCalledWith(row, "name", "Grace");
    expect(undoRedoButtons().apply?.({})).toMatchObject({
      undoRedoButtons: true,
    });
    expect(resolveLabels({}).editCell).toBeTypeOf("string");
    expect(editing<Row>(save).id).toBe("editing");
    scope.stop();
  });
});

it("suspends combined editing, filters and view controls across KeepAlive and invalidates removed controls", async () => {
  const save = vi.fn();
  const showing = shallowRef(true);
  const declarations = shallowRef<readonly ComposedFeature<Row>[]>([
    extendFeature(rowEditing<Row>(save), [
      slotRender(editableCellSlotKey<Row>(), () => null),
      slotRender(rowEditActionsSlotKey<Row>(), () => null),
    ]),
    extendFeature(filters<Row>([{ key: "name", type: "text" }]), [
      slotRender(TOOLBAR_EXTRAS, () => null),
      slotRender(ACTIVE_FILTER_CHIPS, () => null),
    ]),
    nativeDensity(),
    nativeSavedViews({ storageKey: "combined-views", storage: null }),
    rowDetail<Row>((value) => h("span", value.name), ["a"]),
  ]);
  let mounted: UseDataTableShellResult<Row> | undefined;
  let mounts = 0;
  const Child = defineComponent({
    setup() {
      mounts++;
      mounted = useDataTableShell({
        data: [row],
        columns,
        rowKey: (value: Row) => value.id,
        features: declarations,
        urlSync: false,
      });
      return () => h("p", "table");
    },
  });
  const Other = defineComponent({ render: () => h("p", "other") });
  const app = createApp({
    render: () =>
      h(KeepAlive, null, {
        default: () => (showing.value ? h(Child) : h(Other)),
      }),
  });
  app.mount(document.createElement("div"));
  try {
    await nextTick();
    const shell = required(mounted);
    const editor = required(shell.editing.value?.rowEditing);
    const panel = required(shell.state.get(filterViewKey<Row>()).value);
    const views = required(shell.savedViews.value);
    editor.begin(row, "a");
    editor.setDraft("name", "Grace");
    shell.source.value.setExtra("name", "Ada");
    shell.setDensity("compact");
    views.save("Before pause");
    showing.value = false;
    await nextTick();
    editor.save();
    panel.clear();
    panel.trigger.onClick();
    views.save("While paused");
    shell.setDensity("comfortable");
    expect(save).not.toHaveBeenCalled();
    expect(shell.source.value.extra.name).toBe("Ada");
    expect(views.views.value.map((view) => view.name)).toEqual([
      "Before pause",
    ]);
    expect(shell.density.value).toBe("compact");
    showing.value = true;
    await nextTick();
    expect(mounts).toBe(1);
    expect(shell.editing.value?.rowEditing?.draftFor("name")).toBe("Grace");
    editor.save();
    await nextTick();
    expect(save).toHaveBeenCalledExactlyOnceWith(row, { name: "Grace" });
    views.save("After resume");
    expect(views.views.value.map((view) => view.name)).toEqual([
      "Before pause",
      "After resume",
    ]);
    declarations.value = [];
    const removedViews = views.views.value;
    panel.clear();
    views.save("After removal");
    editor.begin(row, "a");
    editor.setDraft("name", "Stale");
    editor.save();
    expect(shell.source.value.extra.name).toBe("Ada");
    expect(views.views.value).toBe(removedViews);
    expect(shell.editing.value).toBeUndefined();
    expect(shell.detail.value).toBeUndefined();
    expect(shell.savedViews.value).toBeUndefined();
    expect(save).toHaveBeenCalledOnce();
  } finally {
    app.unmount();
  }
});
