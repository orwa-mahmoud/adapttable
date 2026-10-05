import {
  type ColumnDragEvent,
  type ColumnLayoutState,
  resolveLabels,
} from "@adapttable/core";
import { LiveFeatureHost } from "@adapttable/core/binding";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import type { ColumnDef } from "../columnDef";
import { columnMenu } from "../features/columnMenu";
import { useColumnLayout } from "./columnLayout";
import { useColumnMenu } from "./useColumnMenu";
import { useColumnRenameEditor } from "./useColumnRenameEditor";
interface Row {
  id: number;
  name: string;
}
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", header: "Name", sortable: true, renameable: true },
  {
    key: "id",
    header: "Identifier",
    lockVisibility: true,
    lockPosition: true,
    lockPin: true,
  },
  { key: "other", header: "Other" },
];
function scopeValue<T>(run: () => T) {
  const scope = effectScope();
  const value = scope.run(run);
  if (!value) throw new Error("Missing model");
  return { value, stop: () => scope.stop() };
}
function call(
  attrs: Readonly<Record<string, unknown>>,
  name: string,
  event: unknown
): void {
  const handler = attrs[name];
  if (typeof handler !== "function") throw new Error(`Missing ${name}`);
  handler(event);
}
describe("Vue column menu model", () => {
  it("uses the public feature identity and both required adapter positions", () => {
    const feature = columnMenu();
    expect(feature.id).toBe("column-menu");
    expect(feature.requiredSlots?.map((slot) => slot.id)).toEqual([
      "column-menu",
      "column-header-rename",
    ]);
  });
  it("keeps the host-controlled layout authoritative on reject and accept", async () => {
    const current = shallowRef<ColumnLayoutState>({
      order: [],
      hidden: [],
      pinned: {},
      widths: {},
    });
    const accept = shallowRef(false);
    const change = vi.fn((next: ColumnLayoutState) => {
      if (accept.value) current.value = next;
    });
    const fixture = scopeValue(() => {
      const layout = useColumnLayout(columns, () => ({
        columnLayout: current,
        onColumnLayoutChange: change,
      }));
      return useColumnMenu(() => ({
        allColumns: columns,
        layout: layout.value,
        labels: resolveLabels(undefined),
        onAutoSize: () => undefined,
      }));
    });
    const first = fixture.value.rows.value[0];
    if (!first) throw new Error("Missing row");
    first.toggleVisible();
    await nextTick();
    expect(change).toHaveBeenLastCalledWith(
      expect.objectContaining({ hidden: ["name"] })
    );
    expect(fixture.value.rows.value[0]?.hidden).toBe(false);
    accept.value = true;
    first.toggleVisible();
    await nextTick();
    expect(fixture.value.rows.value[0]?.hidden).toBe(true);
    fixture.value.rows.value[1]?.toggleVisible();
    expect(current.value.hidden).toEqual(["name"]);
    fixture.stop();
    first.toggleVisible();
    expect(current.value.hidden).toEqual(["name"]);
  });
  it("reads fresh callbacks and row capabilities even through retained menu actions", async () => {
    const sort = shallowRef(vi.fn());
    const declared = shallowRef(columns);
    const fixture = scopeValue(() => {
      const layout = useColumnLayout(declared, {});
      return useColumnMenu(() => ({
        allColumns: declared.value,
        layout: layout.value,
        labels: resolveLabels(undefined),
        onAutoSize: () => undefined,
        onSortColumn: sort.value,
      }));
    });
    const action = fixture.value.rows.value[0]
      ?.actions(() => undefined)
      .find((item) => item.id === "sort-asc");
    if (!action || "kind" in action) throw new Error("Missing sort action");
    const old = sort.value;
    sort.value = vi.fn();
    action.run();
    expect(old).not.toHaveBeenCalled();
    expect(sort.value).toHaveBeenCalledWith("name", "asc");
    declared.value = columns.filter((column) => column.key !== "name");
    await nextTick();
    action.run();
    expect(sort.value).toHaveBeenCalledTimes(1);
    fixture.stop();
  });
  it("keeps plugin choices local to one table and resolves their current state", () => {
    const host = new LiveFeatureHost<Row>();
    const value = shallowRef("sum");
    const callback = vi.fn();
    host.registerColumnMenuAction(() => ({
      kind: "choice",
      id: "aggregate",
      label: "Aggregate",
      value: value.value,
      disabled: false,
      options: [
        { value: "sum", label: "Sum" },
        { value: "avg", label: "Average" },
      ],
      onChange: callback,
    }));
    const fixture = scopeValue(() => {
      const layout = useColumnLayout(columns, {});
      return useColumnMenu(() => ({
        allColumns: columns,
        layout: layout.value,
        featureHost: host,
        labels: resolveLabels(undefined),
        onAutoSize: () => undefined,
      }));
    });
    const item = fixture.value.rows.value[0]
      ?.actions(() => undefined)
      .find((action) => action.id === "aggregate");
    if (!item || !("kind" in item)) throw new Error("Missing plugin choice");
    item.onChange("avg");
    expect(callback).toHaveBeenCalledWith("avg");
    value.value = "avg";
    expect(
      fixture.value.rows.value[0]
        ?.actions(() => undefined)
        .find((action) => "kind" in action && action.value === "avg")
    ).toBeDefined();
    host.columnMenuActions.splice(0);
    item.onChange("sum");
    expect(callback).toHaveBeenCalledTimes(1);
    fixture.stop();
    item.onChange("sum");
    expect(callback).toHaveBeenCalledTimes(1);
  });
  it("filters bulk actions, honors locks, manages reserved edge rows and resets", () => {
    const fixture = scopeValue(() => {
      const layout = useColumnLayout(columns, {});
      const model = useColumnMenu(() => ({
        allColumns: columns,
        layout: layout.value,
        labels: resolveLabels(undefined),
        hasRowActions: true,
        hasRowReorder: true,
        onAutoSize: () => undefined,
      }));
      return { layout, model };
    });
    const { model, layout } = fixture.value;
    model.setQuery("  NAME ");
    model.hideAll();
    expect(layout.value.state.hidden).toEqual(["name"]);
    model.showAll();
    expect(layout.value.state.hidden).toEqual([]);
    model.rows.value[0]?.togglePin();
    expect(layout.value.state.pinned.name).toBe("start");
    model.unpinAll();
    expect(layout.value.state.pinned).toEqual({});
    model.edgeRows.value[0]?.togglePin();
    model.edgeRows.value[1]?.togglePin();
    model.edgeRows.value[1]?.toggleVisible();
    expect(layout.value.state.pinned).toEqual({
      reorder: "start",
      actions: "end",
    });
    expect(layout.value.state.hidden).toEqual(["actions"]);
    model.reset();
    expect(layout.value.state.hidden).toEqual([]);
    fixture.stop();
  });
  it("revokes all retained menu operations on scope disposal and ignores obsolete drag targets", () => {
    const declared = shallowRef(columns);
    const resize = vi.fn();
    const fixture = scopeValue(() => {
      const layout = useColumnLayout(declared, {});
      const model = useColumnMenu(() => ({
        allColumns: declared.value,
        layout: layout.value,
        labels: resolveLabels(undefined),
        hasRowReorder: true,
        hasRowActions: true,
        onAutoSize: resize,
      }));
      return { layout, model };
    });
    const { model, layout } = fixture.value;
    const first = model.rows.value[0];
    const reorder = model.edgeRows.value[0];
    const actions = model.edgeRows.value[1];
    if (!first || !reorder || !actions) throw new Error("Missing rows");
    reorder.toggleVisible();
    reorder.togglePin();
    reorder.togglePin();
    actions.togglePin();
    actions.togglePin();
    expect(layout.value.state.hidden).toEqual(["reorder"]);
    expect(layout.value.state.pinned).toEqual({});
    const e: ColumnDragEvent = {
      target: null,
      dataTransfer: null,
      defaultPrevented: false,
      preventDefault: () => undefined,
    };
    call(first.rowAttrs, "onDragover", e);
    call(
      first.gripAttrs,
      "onKeydown",
      new KeyboardEvent("keydown", { key: "ArrowDown", isComposing: true })
    );
    const grip = document.createElement("button");
    grip.setAttribute("dir", "ltr");
    call(first.gripAttrs, "onKeydown", {
      key: "ArrowDown",
      currentTarget: grip,
      preventDefault: () => undefined,
    });
    declared.value = columns.filter((column) => column.key !== "name");
    call(first.rowAttrs, "onDragstart", e);
    call(first.rowAttrs, "onDragover", e);
    call(first.rowAttrs, "onDrop", e);
    call(
      first.gripAttrs,
      "onKeydown",
      new KeyboardEvent("keydown", { key: "ArrowDown" })
    );
    first.toggleVisible();
    first.togglePin();
    first.rename.onRename("name", "Missing");
    fixture.stop();
    const previous = layout.value.state;
    model.setQuery("late");
    model.showAll();
    model.hideAll();
    model.unpinAll();
    model.reset();
    model.autoSize();
    first.toggleVisible();
    first.togglePin();
    reorder.toggleVisible();
    actions.toggleVisible();
    reorder.togglePin();
    actions.togglePin();
    expect(layout.value.state).toBe(previous);
    expect(resize).not.toHaveBeenCalled();
    expect(model.query.value).toBe("");
  });
  it("uses neutral drag and RTL keyboard ordering with full unfiltered indices", () => {
    const fixture = scopeValue(() => {
      const layout = useColumnLayout(columns, {});
      return {
        layout,
        model: useColumnMenu(() => ({
          allColumns: columns,
          layout: layout.value,
          dir: "rtl",
          labels: resolveLabels(undefined),
          onAutoSize: () => undefined,
        })),
      };
    });
    const { model, layout } = fixture.value;
    const other = model.rows.value.find((row) => row.key === "other");
    if (!other) throw new Error("Missing other row");
    call(
      other.gripAttrs,
      "onKeydown",
      new KeyboardEvent("keydown", { key: "ArrowRight" })
    );
    expect(layout.value.state.order).toEqual(["name", "other", "id"]);
    const first = model.rows.value[0];
    if (!first) throw new Error("Missing first row");
    const data = new Map<string, string>();
    const event: ColumnDragEvent = {
      target: null,
      dataTransfer: {
        types: ["application/x-adapttable-column"],
        effectAllowed: "",
        dropEffect: "",
        setData: (key, value) => {
          data.set(key, value);
        },
        getData: (key) => data.get(key) ?? "",
      },
      defaultPrevented: false,
      preventDefault: vi.fn(),
    };
    call(first.rowAttrs, "onDragstart", event);
    expect(model.rows.value[0]?.rowAttrs["data-dragging"]).toBe("");
    call(other.rowAttrs, "onDrop", event);
    expect(layout.value.state.order).toEqual(["other", "name", "id"]);
    expect(
      model.rows.value.every(
        (row) => row.rowAttrs["data-dragging"] === undefined
      )
    ).toBe(true);
    fixture.stop();
  });
});
describe("Vue neutral rename projection", () => {
  it("validates, trims, updates messages and callbacks, cancels, and revokes disposed actions", () => {
    const rename = shallowRef(vi.fn());
    const required = shallowRef("Required");
    const fixture = scopeValue(() =>
      useColumnRenameEditor(() => ({
        key: "name",
        name: "Name",
        onRename: rename.value,
        requiredMessage: required.value,
        renamedMessage: ({ name }) => `Changed to ${name}`,
      }))
    );
    const model = fixture.value;
    model.begin();
    model.setDraft("   ");
    expect(model.submit()).toBe(false);
    expect(model.snapshot.value.error).toBe("Required");
    required.value = "Nom requis";
    model.submit();
    expect(model.snapshot.value.error).toBe("Nom requis");
    const old = rename.value;
    rename.value = vi.fn();
    model.setDraft("  Updated  ");
    expect(model.submit()).toBe(true);
    expect(old).not.toHaveBeenCalled();
    expect(rename.value).toHaveBeenCalledWith("name", "Updated");
    expect(model.snapshot.value.announcement).toBe("Changed to Updated");
    model.begin();
    model.setDraft("Discard");
    model.cancel();
    expect(model.snapshot.value.draft).toBe("Name");
    fixture.stop();
    model.begin();
    model.setDraft("Late");
    model.submit();
    expect(rename.value).toHaveBeenCalledTimes(1);
  });
  it("is safe without document and revokes retained validation/cancel callbacks", async () => {
    const fixture = scopeValue(() =>
      useColumnRenameEditor({
        key: "name",
        name: "Name",
        onRename: () => undefined,
        requiredMessage: "Required",
        renamedMessage: ({ name }) => name,
      })
    );
    const model = fixture.value;
    vi.stubGlobal("document", undefined);
    try {
      model.begin();
    } finally {
      vi.unstubAllGlobals();
    }
    model.setDraft(" ");
    model.inputAttrs().onBlur();
    expect(model.snapshot.value.error).toBe("Required");
    model
      .inputAttrs()
      .onKeydown(
        new KeyboardEvent("keydown", { key: "Enter", isComposing: true })
      );
    expect(model.editing.value).toBe(true);
    model.setDraft("Name");
    expect(model.submit()).toBe(false);
    model.begin();
    model.cancel();
    model.begin();
    await nextTick();
    expect(model.editing.value).toBe(true);
    const attrs = model.inputAttrs();
    fixture.stop();
    attrs.onBlur();
    model.cancel();
    expect(model.submit()).toBe(false);
  });
});
