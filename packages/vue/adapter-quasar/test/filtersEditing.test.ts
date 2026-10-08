import {
  type ColumnDef,
  type ComposedFeature,
  type CustomCellEditorCtrl,
  type FilterDef,
  type FilterFormSource,
  type TableSource,
} from "@adapttable/vue";
import {
  provideDataTableClassNames,
  resolveLabels,
} from "@adapttable/vue/adapter";
import { mount } from "@vue/test-utils";
import {
  QBtn,
  QCheckbox,
  QDialog,
  QExpansionItem,
  QInput,
  QMenu,
  QSelect,
  Quasar,
} from "quasar";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";

import { DataTable } from "../src";
import {
  batchEditing,
  dirtyIndicators,
  editHistory,
  editing,
  rowEditing,
  undoRedoButtons,
} from "../src/editing";
import {
  ChecklistFilter,
  filters,
  FilterTreeBuilder,
  QuasarFilterField,
} from "../src/filters";
import {
  FilterHeaderControl,
  FilterHeaderRow,
  headerFilters,
  QuasarHeaderFilter,
} from "../src/header-filters";

interface Row {
  id: string;
  name: string;
  amount: number;
  active: boolean;
  tags: string[];
}
const rows: readonly Row[] = [
  { id: "1", name: "Ada", amount: 2, active: true, tags: ["a"] },
  { id: "2", name: "Grace", amount: 3, active: false, tags: ["b"] },
];
const labels = resolveLabels(undefined);
const wrappers: ReturnType<typeof mount>[] = [];
const host = (render: () => VNodeChild) => {
  const wrapper = mount(
    defineComponent({
      setup() {
        provideDataTableClassNames(() => ({
          filterField: "field-paint",
          filterHeaderInput: "header-paint",
          editCellEditor: "editor-paint",
        }));
        return render;
      },
    }),
    { attachTo: document.body, global: { plugins: [Quasar] } }
  );
  wrappers.push(wrapper);
  return wrapper;
};
const settle = async () => {
  await nextTick();
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 30));
  await nextTick();
};
afterEach(async () => {
  for (const w of wrappers.splice(0)) w.unmount();
  await settle();
});
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function clickPart(name: string) {
  const button = document.body.querySelector<HTMLElement>(part(name));
  if (!button) throw new Error(`Missing ${name}`);
  button.click();
  await settle();
}
function bag(accept = true) {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  const setExtra = vi.fn(
    (key: string, value: Parameters<FilterFormSource<Row>["setExtra"]>[1]) => {
      if (accept) extra.value = { ...extra.value, [key]: value };
    }
  );
  const setExtras = vi.fn(
    (patch: Parameters<FilterFormSource<Row>["setExtras"]>[0]) => {
      if (accept) extra.value = { ...extra.value, ...patch };
    }
  );
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    setExtra,
    setExtras,
    allFilteredRows: rows,
  }));
  return { extra, setExtra, setExtras, source };
}
function field(def: FilterDef<Row>, accept = true) {
  const state = bag(accept);
  const wrapper = host(() =>
    h(QuasarFilterField<Row>, { def, source: state.source.value, labels })
  );
  return { ...state, wrapper };
}
function table(
  features: readonly ComposedFeature<Row>[],
  columns: readonly ColumnDef<Row>[] = [{ key: "name", editable: true }],
  mobile = false
) {
  return host(() =>
    h(DataTable<Row>, {
      data: rows,
      columns,
      rowKey: (row) => row.id,
      features,
      forceMobile: mobile,
      urlSync: false,
      searchable: false,
    })
  );
}
async function activate(wrapper: ReturnType<typeof host>) {
  const target = wrapper.get(part("edit-cell-activate"));
  (target.element as HTMLElement).focus();
  await target.trigger("keydown", { key: "F2", keyCode: 113 });
  await settle();
  return wrapper.get(part("edit-cell-editor"));
}

describe("Quasar filters and editors", () => {
  it("uses the real field primitives and rejects controlled text/select/checkbox writes once", async () => {
    const text = field({ key: "name", type: "text" }, false);
    await text.wrapper.getComponent(QInput).get("input").setValue("Rejected");
    await settle();
    expect(text.setExtras).toHaveBeenCalledTimes(1);
    expect(text.wrapper.getComponent(QInput).get("input").element.value).toBe(
      ""
    );
    expect(text.wrapper.get(part("filter-field")).classes()).toContain(
      "field-paint"
    );
    const select = field(
      {
        key: "name",
        type: "select",
        options: [{ value: "Ada", label: "Ada" }],
      },
      false
    );
    select.wrapper
      .getComponent(QSelect)
      .vm.toggleOption({ value: "Ada", label: "Ada" });
    await settle();
    expect(select.setExtra).toHaveBeenCalledExactlyOnceWith("name", "Ada");
    expect(select.wrapper.getComponent(QSelect).props("modelValue")).toBe("");
    const multi = field(
      {
        key: "name",
        type: "multiSelect",
        options: [{ value: "Ada", label: "Ada" }],
      },
      false
    );
    await multi.wrapper.getComponent(QCheckbox).trigger("click");
    await settle();
    expect(multi.setExtra).toHaveBeenCalledExactlyOnceWith("name", ["Ada"]);
    expect(
      multi.wrapper.get('[role="checkbox"]').attributes("aria-checked")
    ).toBe("false");
    expect(document.querySelector("label label")).toBeNull();
  });
  it("accepts boolean and two-ended number/date range requests", async () => {
    const boolean = field({ key: "active", type: "boolean" });
    boolean.wrapper
      .getComponent(QSelect)
      .vm.toggleOption({ value: "true", label: "Yes" });
    await settle();
    expect(boolean.extra.value.active).toBe("true");
    for (const type of ["numberRange", "dateRange"] as const) {
      const range = field({ key: "amount", type });
      range.wrapper
        .getComponent(QSelect)
        .vm.toggleOption({ value: "between", label: "Between" });
      await settle();
      expect(range.wrapper.findAllComponents(QInput)).toHaveLength(2);
      await range.wrapper
        .findAllComponents(QInput)[0]!
        .get("input")
        .setValue(type === "dateRange" ? "2026-10-01" : "1");
      await range.wrapper
        .findAllComponents(QInput)[1]!
        .get("input")
        .setValue(type === "dateRange" ? "2026-10-06" : "5");
      await settle();
      expect(range.setExtras).toHaveBeenCalled();
    }
  });
  it("uses searchable checklist counts and binding-owned selection", async () => {
    const state = bag();
    const wrapper = host(() =>
      h(ChecklistFilter<Row>, {
        def: { key: "name", type: "checklist" },
        source: state.source.value,
        labels,
      })
    );
    await settle();
    expect(wrapper.findAllComponents(QCheckbox)).toHaveLength(2);
    expect(wrapper.findAll(part("filter-checklist-count"))).toHaveLength(2);
    await wrapper.getComponent(QInput).get("input").setValue("Ada");
    await settle();
    expect(wrapper.findAllComponents(QCheckbox)).toHaveLength(1);
    await wrapper.getComponent(QCheckbox).trigger("click");
    await settle();
    expect(state.extra.value.name).toEqual(["Ada"]);
    await wrapper.findAllComponents(QBtn)[1]!.trigger("click");
    await settle();
    expect(state.extra.value.name).toBeUndefined();
    await wrapper.findAllComponents(QBtn)[0]!.trigger("click");
    await settle();
    expect(state.extra.value.name).toEqual(["Ada"]);
  });
  it("opens the kit popover, filters the actual table, and removes active chips", async () => {
    const wrapper = table([
      filters<Row>([{ key: "name", type: "text" }], { tree: true }),
      headerFilters(),
    ]);
    await wrapper.get(part("filters-button")).trigger("click");
    await settle();
    const menu = wrapper.getComponent(QMenu);
    expect(document.body.querySelector(part("filters-popover"))).not.toBeNull();
    expect(
      document.body.querySelector(part("filters-popover"))?.getAttribute("role")
    ).toBe("dialog");
    expect(wrapper.findComponent(QExpansionItem).exists()).toBe(true);
    await menu.getComponent(QInput).get("input").setValue("Ada");
    await settle();
    expect(wrapper.get("tbody").text()).not.toContain("Grace");
    await clickPart("filters-done");
    await settle();
    expect(
      wrapper.get(part("filters-button")).attributes("aria-expanded")
    ).toBe("false");
    expect(wrapper.find(part("chip-remove")).exists()).toBe(true);
    await wrapper.get(part("chip-remove")).trigger("click");
    await settle();
    expect(wrapper.get("tbody").text()).toContain("Grace");
  });
  it("uses QDialog for the drawer and QMenu for header close-on-select", async () => {
    const wrapper = table([
      filters<Row>([{ key: "name", type: "text" }], { mode: "drawer" }),
    ]);
    await wrapper.get(part("filters-button")).trigger("click");
    await settle();
    expect(wrapper.getComponent(QDialog).props("position")).toBe("right");
    expect(document.body.querySelector(part("filters-panel"))).not.toBeNull();
    await clickPart("filters-close");
    await settle();
    const state = bag();
    const header = host(() =>
      h(QuasarHeaderFilter<Row>, {
        def: {
          key: "name",
          type: "select",
          options: [{ label: "Ada", value: "Ada" }],
        },
        source: state.source.value,
        labels,
        closeOnSelect: true,
        dir: "rtl",
      })
    );
    await header.get(part("filter-header-trigger")).trigger("click");
    await settle();
    expect(header.getComponent(QMenu).props("anchor")).toBe("bottom right");
    header
      .getComponent(QSelect)
      .vm.toggleOption({ label: "Ada", value: "Ada" });
    await settle();
    expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", "Ada");
    expect(
      header.get(part("filter-header-trigger")).attributes("aria-expanded")
    ).toBe("false");
  });
  it("renders each compact header control with the real SDK", async () => {
    for (const type of [
      "text",
      "select",
      "multiSelect",
      "numberRange",
      "boolean",
    ] as const) {
      const state = bag();
      const wrapper = host(() =>
        h(FilterHeaderControl<Row>, {
          def: { key: "name", type, options: [{ label: "Ada", value: "Ada" }] },
          source: state.source.value,
          labels,
          dir: "rtl",
        })
      );
      await settle();
      if (type === "multiSelect") {
        await wrapper.getComponent(QBtn).trigger("click");
        await settle();
        await wrapper.getComponent(QCheckbox).trigger("click");
      } else if (type === "select" || type === "boolean")
        wrapper.getComponent(QSelect).vm.toggleOption({
          label: "Ada",
          value: type === "boolean" ? "true" : "Ada",
        });
      else await wrapper.getComponent(QInput).get("input").setValue("2");
      await settle();
      expect(
        state.setExtra.mock.calls.length + state.setExtras.mock.calls.length
      ).toBeGreaterThan(0);
    }
  });
  it.each([false, true])(
    "activates, focuses, cancels and commits in layout mobile=%s",
    async (mobile) => {
      const save = vi.fn();
      const wrapper = table(
        [editing<Row>(save)],
        [{ key: "name", editable: true }],
        mobile
      );
      let input = await activate(wrapper);
      expect(document.activeElement).toBe(input.element);
      await input.setValue("Draft");
      await input.trigger("keydown", { key: "Escape", keyCode: 27 });
      await settle();
      expect(save).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(
        wrapper.get(part("edit-cell-activate")).element
      );
      input = await activate(wrapper);
      await input.setValue("Accepted");
      await input.trigger("keydown", { key: "Enter", keyCode: 13 });
      await settle();
      expect(save).toHaveBeenCalledExactlyOnceWith(rows[0], "name", "Accepted");
      expect(rows[0]!.name).toBe("Ada");
    }
  );
  it.each([
    ["number", "number"],
    ["date", "date"],
    ["datetime", "datetime-local"],
    ["time", "time"],
    ["text", "text"],
  ] as const)("uses %s editor input type", async (editor, type) => {
    const wrapper = table(
      [editing<Row>(vi.fn())],
      [{ key: "name", editable: true, editor }]
    );
    const input = await activate(wrapper);
    expect(input.attributes("type")).toBe(type);
  });
  it("uses boolean/select/multi-select editors and forwards draft changes", async () => {
    for (const editor of [
      "boolean",
      {
        type: "select",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
      {
        type: "multi-select",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
    ] as const) {
      const save = vi.fn();
      const wrapper = table(
        [editing<Row>(save)],
        [
          {
            key: editor === "boolean" ? "active" : "tags",
            editable: true,
            editor,
          },
        ]
      );
      await activate(wrapper);
      if (editor === "boolean")
        await wrapper.getComponent(QCheckbox).trigger("click");
      else
        wrapper
          .getComponent(QSelect)
          .vm.toggleOption({ value: "b", label: "B" });
      await settle();
      await wrapper
        .get(part("edit-cell-editor"))
        .trigger("keydown", { key: "Enter", keyCode: 13 });
      await settle();
      expect(save).toHaveBeenCalledTimes(1);
    }
  });
  it("assembles row, batch and history controls without writing authoritative rows", async () => {
    for (const mode of ["row", "batch"] as const) {
      const save = vi.fn();
      const wrapper = table([
        editing<Row>(vi.fn()),
        mode === "row"
          ? rowEditing<Row>(save, {
              rowEditIcons: { begin: false, save: false, cancel: false },
            })
          : batchEditing<Row>(save),
        dirtyIndicators(),
        editHistory(),
        undoRedoButtons(),
      ]);
      if (mode === "row") {
        await wrapper.get(part("row-edit-begin")).trigger("click");
        await settle();
      } else await settle();
      await wrapper.get(part("edit-cell-editor")).setValue("Draft");
      await settle();
      const buttons = wrapper.findAllComponents(QBtn);
      const saveButton = buttons.find(
        (button) =>
          button.attributes("data-adapttable-part") ===
          (mode === "row" ? "row-edit-save" : "batch-edit-save")
      );
      expect(saveButton).toBeDefined();
      await saveButton!.trigger("click");
      await settle();
      expect(save).toHaveBeenCalledTimes(1);
      expect(rows[0]!.name).toBe("Ada");
    }
  });
  it("runs advanced tree actions, compact header geometry, and checklist field composition", async () => {
    const tree =
      shallowRef<
        Parameters<NonNullable<TableSource<Row>["setFilterTree"]>>[0]
      >();
    const change = vi.fn((value: typeof tree.value) => {
      tree.value = value;
    });
    const wrapper = host(() =>
      h(FilterTreeBuilder<Row>, {
        defs: [{ key: "name", type: "text" }],
        source: { filterTree: tree.value, setFilterTree: change },
        defaultExpanded: true,
      })
    );
    await settle();
    expect(wrapper.get(part("filter-tree-summary")).text()).toBe(
      labels.filterTree
    );
    await wrapper
      .findAllComponents(QBtn)
      .find((button) => button.text() === labels.filterAddCondition)!
      .trigger("click");
    await settle();
    expect(wrapper.findComponent(QInput).exists()).toBe(true);
    await wrapper.getComponent(QInput).get("input").setValue("Ada");
    await settle();
    expect(JSON.stringify(tree.value)).toContain("Ada");
    await wrapper.get(part("filter-tree-remove")).trigger("click");
    await settle();
    expect(change).toHaveBeenCalled();
    await wrapper
      .getComponent(QExpansionItem)
      .get('[role="button"]')
      .trigger("click");
    await settle();
    const state = bag();
    const compact = host(() =>
      h("table", [
        h("thead", [
          h(FilterHeaderRow<Row>, {
            columns: [{ key: "name" }],
            defs: [{ key: "name", type: "text" }],
            source: state.source.value,
            labels,
            enabled: true,
            dir: "rtl",
            classNames: { filterHeaderInput: "compact-paint" },
          }),
        ]),
      ])
    );
    expect(compact.get("tr").attributes("dir")).toBe("rtl");
    expect(compact.getComponent(QInput).get("input").classes()).toContain(
      "compact-paint"
    );
    const checklist = field({ key: "name", type: "checklist" });
    await settle();
    expect(checklist.wrapper.get("legend").text()).toBe("Name");
  });
  it("keeps validation on the actual input and renders rollback after a rejected host save", async () => {
    const save = vi.fn();
    const wrapper = table(
      [editing<Row>(save)],
      [
        {
          key: "name",
          editable: true,
          validate: (value) =>
            value === "bad" ? "Use another name" : undefined,
        },
      ]
    );
    const input = await activate(wrapper);
    await input.setValue("bad");
    await input.trigger("keydown", { key: "Enter", keyCode: 13 });
    await settle();
    expect(input.attributes("aria-invalid")).toBe("true");
    expect(input.attributes("aria-describedby")).toBe(
      wrapper.get(part("edit-cell-error")).attributes("id")
    );
    expect(save).not.toHaveBeenCalled();
    await input.setValue("Good");
    await input.trigger("keydown", { key: "Enter", keyCode: 13 });
    await settle();
    expect(save).toHaveBeenCalledTimes(1);
    const rollback = vi.fn();
    const failed = table([
      editing<Row>(() => Promise.reject(new Error("offline")), {
        formatEditError: () => "Offline",
        onEditRollback: rollback,
      }),
    ]);
    const rejected = await activate(failed);
    await rejected.setValue("Draft");
    await rejected.trigger("keydown", { key: "Enter", keyCode: 13 });
    await settle();
    expect(failed.get(part("edit-cell-save-error")).text()).toContain(
      "Offline"
    );
    await failed.get(part("edit-cell-rollback")).trigger("mousedown");
    await failed.get(part("edit-cell-rollback")).trigger("click");
    await settle();
    expect(rollback).toHaveBeenCalledTimes(1);
  });
  it("leaves select popup keys to Quasar, then commits after it closes", async () => {
    const save = vi.fn();
    const wrapper = table(
      [editing<Row>(save)],
      [
        {
          key: "name",
          editable: true,
          editor: { type: "select", options: ["Ada", "Grace"] },
        },
      ]
    );
    const input = await activate(wrapper);
    await input.trigger("keydown", { key: "ArrowDown", keyCode: 40 });
    await settle();
    expect(input.attributes("aria-expanded")).toBe("true");
    await input.trigger("keydown", { key: "ArrowDown", keyCode: 40 });
    await input.trigger("keydown", { key: "Enter", keyCode: 13 });
    await settle();
    expect(save).not.toHaveBeenCalled();
    expect(input.attributes("aria-expanded")).toBe("false");
    await input.trigger("keydown", { key: "Enter", keyCode: 13 });
    await settle();
    expect(save).toHaveBeenCalledTimes(1);
  });
  it("commits a checkbox only after focus leaves its complete control", async () => {
    const save = vi.fn();
    const wrapper = table(
      [editing<Row>(save)],
      [{ key: "active", editable: true, editor: "boolean" }]
    );
    const editor = await activate(wrapper);
    await editor.trigger("click");
    await settle();
    expect(save).not.toHaveBeenCalled();
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    await settle();
    outside.remove();
    expect(save).toHaveBeenCalledExactlyOnceWith(rows[0], "active", false);
  });
  it("passes custom Vue editors the binding focus and draft contract", async () => {
    const save = vi.fn();
    const wrapper = table(
      [editing<Row>(save)],
      [
        {
          key: "name",
          editable: true,
          editor: {
            type: "custom",
            render: (control: CustomCellEditorCtrl) =>
              h("input", {
                "data-custom-editor": "",
                ref: (node: unknown) =>
                  control.focusRef(
                    node instanceof HTMLInputElement ? node : null
                  ),
                value: control.draft,
                onInput: (event: Event) => {
                  if (event.currentTarget instanceof HTMLInputElement)
                    control.setDraft(event.currentTarget.value);
                },
                onKeydown: control.onKeyDown,
              }),
          },
        },
      ]
    );
    await wrapper.get(part("edit-cell-activate")).trigger("dblclick");
    await settle();
    const input = wrapper.get("[data-custom-editor]");
    expect(document.activeElement).toBe(input.element);
    await input.setValue("Custom");
    await input.trigger("keydown", { key: "Enter", keyCode: 13 });
    await settle();
    expect(save).toHaveBeenCalledExactlyOnceWith(rows[0], "name", "Custom");
  });
});
