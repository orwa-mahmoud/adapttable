import type * as BindingAdapter from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { type ComponentPublicInstance, h, shallowRef } from "vue";

const mounts = vi.hoisted(() => ({
  cell: vi.fn(),
  field: vi.fn(),
  checklist: vi.fn(),
}));
vi.mock("@adapttable/vue/adapter", async (load) => {
  const actual = await load<typeof BindingAdapter>();
  return {
    ...actual,
    useEditableCellModel: (
      input: Parameters<typeof actual.useEditableCellModel>[0]
    ) => {
      mounts.cell();
      return actual.useEditableCellModel(input);
    },
    useFilterField: (input: Parameters<typeof actual.useFilterField>[0]) => {
      mounts.field();
      return actual.useFilterField(input);
    },
    useChecklistModel: (
      input: Parameters<typeof actual.useChecklistModel>[0]
    ) => {
      mounts.checklist();
      return actual.useChecklistModel(input);
    },
  };
});
import type { FilterDef, FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";

import { DataTable } from "../src";
import { editing } from "../src/editing";
import {
  FilterTreeBuilder as NativeFilterTree,
  NativeFilterField,
} from "../src/filters";
import { find, mountNative, part, tick, write } from "./filter-editing-helpers";

interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [{ id: "1", name: "Ada" }];

describe("generic native component lifetime", () => {
  it("forwards arbitrary root attributes and listeners once, with refs on the semantic root", async () => {
    const title = shallowRef("Initial title");
    const clicked = vi.fn();
    let instance: Element | ComponentPublicInstance | null = null;
    const view = mountNative(() =>
      h(NativeFilterTree<Row>, {
        defs: [{ key: "name", type: "text" }],
        source: { filterTree: undefined, setFilterTree: vi.fn() },
        id: "native-tree-root",
        "data-host": "owner",
        title: title.value,
        onClick: clicked,
        ref: (value) => {
          instance = value;
        },
      })
    );
    const root = find<HTMLDetailsElement>(view.host, "details");
    expect(root.id).toBe("native-tree-root");
    expect(root.getAttribute("data-host")).toBe("owner");
    expect(root.title).toBe("Initial title");
    expect(instance).toHaveProperty("$el", root);
    root.click();
    expect(clicked).toHaveBeenCalledOnce();
    title.value = "Updated title";
    await tick();
    expect(find(view.host, "details")).toBe(root);
    expect(root.title).toBe("Updated title");
    expect(instance).toHaveProperty("$el", root);
  });
  it("lets an omitted expansion option follow the existing filter tree on first mount", () => {
    const view = mountNative(() =>
      h(NativeFilterTree<Row>, {
        defs: [{ key: "name", type: "text" }],
        source: {
          filterTree: { combinator: "and", conditions: [] },
          setFilterTree: vi.fn(),
        },
      })
    );
    expect(find<HTMLDetailsElement>(view.host, "details").open).toBe(true);
  });

  it("retains an active editor, draft and focus through parent updates", async () => {
    mounts.cell.mockClear();
    const columns = shallowRef([
      { key: "name", header: "Name", editable: true },
    ]);
    const commit = vi.fn();
    const features = [editing<Row>(commit)];
    const view = mountNative(() =>
      h(DataTable<Row>, {
        data: rows,
        columns: columns.value,
        rowKey: (row: Row) => row.id,
        features,
        urlSync: false,
      })
    );
    const activate = find(view.host, part("edit-cell-activate"));
    activate.focus();
    activate.dispatchEvent(
      new KeyboardEvent("keydown", { key: "F2", bubbles: true })
    );
    await tick();
    const input = find<HTMLInputElement>(
      view.host,
      'td[data-column-key="name"] input'
    );
    await write(input, "Uncommitted draft");
    columns.value = [{ ...columns.value[0]!, header: "Renamed header" }];
    await tick();
    expect(find(view.host, 'td[data-column-key="name"] input')).toBe(input);
    expect(input.value).toBe("Uncommitted draft");
    expect(document.activeElement).toBe(input);
    expect(mounts.cell).toHaveBeenCalledOnce();
    expect(commit).not.toHaveBeenCalled();
    view.stop();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    await tick();
    expect(commit).not.toHaveBeenCalled();
  });

  it("keeps one field scope across prop updates and disposes it when the widget changes", async () => {
    mounts.field.mockClear();
    mounts.checklist.mockClear();
    const def = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "text",
      label: "Name",
    });
    const changes = vi.fn();
    const source: FilterFormSource<Row> = {
      extra: {},
      allFilteredRows: rows,
      setExtra: changes,
      setExtras: changes,
    };
    const view = mountNative(() =>
      h(NativeFilterField<Row>, {
        def: def.value,
        source,
        labels: resolveLabels(undefined),
      })
    );
    const input = find<HTMLInputElement>(view.host, "input");
    input.focus();
    def.value = { ...def.value, label: "Renamed field" };
    await tick();
    expect(find(view.host, "input")).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-label")).toBe("Renamed field");
    expect(mounts.field).toHaveBeenCalledOnce();
    expect(mounts.checklist).not.toHaveBeenCalled();
    def.value = {
      key: "name",
      type: "checklist",
      options: [{ value: "Ada", label: "Ada" }],
    };
    await tick();
    expect(mounts.checklist).toHaveBeenCalledOnce();
    expect(mounts.field).toHaveBeenCalledOnce();
    await write(input, "Retired field");
    expect(changes).not.toHaveBeenCalled();
    view.stop();
  });
});
