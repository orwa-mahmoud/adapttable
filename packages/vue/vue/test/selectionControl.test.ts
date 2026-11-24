import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
} from "vue";

import type { Attrs } from "../src/attrs";
import { selection } from "../src/features/headlessFactories";
import {
  DesktopTableChrome,
  MobileCardsChrome,
  type SelectionCheckboxProps,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import {
  type SelectionCheckboxAttrs,
  selectionCheckboxControl,
  selectionCheckboxInputAttrs,
} from "../src/selection/checkboxControl";
import { useRowSelection } from "../src/selection/selection";
import {
  useDataTableShell,
  type UseDataTableShellResult,
} from "../src/useDataTableShell";
import { ModelCheckbox } from "./fixtures/ModelCheckbox";

interface Row {
  id: string;
  name: string;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((dispose) => dispose()));
function checkbox(root: ParentNode, selector: string): HTMLInputElement {
  const node = root.querySelector<HTMLInputElement>(selector);
  if (!node) throw new Error(`Missing checkbox: ${selector}`);
  return node;
}
interface FixtureOptions {
  readonly mobile?: boolean;
  readonly card?: NonNullable<TableChromeSlots<Row>["card"]>;
  readonly controlled?: readonly string[];
  readonly accept?: boolean;
  readonly defaultSelectedIds?: readonly string[];
  readonly attrs?: Attrs;
  readonly legacyChange?: boolean;
}
function mount(options: FixtureOptions = {}) {
  const root = document.createElement("div");
  document.body.append(root);
  const selectedIds = shallowRef(options.controlled);
  const updates: string[][] = [];
  let shell: UseDataTableShellResult<Row> | undefined;
  let controls: SelectionCheckboxProps[] = [];
  const app = createApp(
    defineComponent({
      setup() {
        shell = useDataTableShell<Row>(() => ({
          data,
          columns: [{ key: "name", sortable: true }],
          rowKey: (row) => row.id,
          urlSync: false,
          forceMobile: options.mobile ?? false,
          features: [
            selection({
              selectedIds,
              defaultSelectedIds: options.defaultSelectedIds,
              onSelectionChange: (ids) => {
                updates.push(ids);
                if (options.accept) selectedIds.value = ids;
              },
            }),
          ],
        }));
        const slots: TableChromeSlots<Row> = {
          card: options.card,
          SortButton: ({ attrs, content }) => h("button", attrs, [content]),
          SelectionCheckbox: (props) => {
            controls.push(props);
            const nativeAttrs = { ...props.attrs, ...options.attrs };
            return h(ModelCheckbox, {
              ...(options.legacyChange
                ? nativeAttrs
                : selectionCheckboxInputAttrs(nativeAttrs)),
              modelValue: props.checked,
              indeterminate: props.indeterminate,
              // This subscribes to one interaction, not to a boolean setter.
              "onUpdate:modelValue": props.onToggle,
            });
          },
        };
        return () => {
          if (!shell) throw new Error("Missing shell");
          controls = [];
          return options.mobile
            ? MobileCardsChrome({ model: shell.mobile.value, slots })
            : DesktopTableChrome({ model: shell.desktop.value, slots });
        };
      },
    })
  );
  app.mount(root);
  if (!shell) throw new Error("Missing shell");
  cleanup.push(() => {
    app.unmount();
    root.remove();
  });
  return {
    root,
    shell,
    selectedIds,
    updates,
    controls: () => controls,
    firstRow: () =>
      checkbox(root, options.mobile ? "article input" : "tbody input"),
  };
}

describe("semantic selection control projection", () => {
  it.each(["search", "extra", "tree", "group"] as const)(
    "clears selection and all-matching when the %s query changes",
    async (query) => {
      const view = mount({ defaultSelectedIds: ["a", "off-page"] });
      view.shell.selection.value!.selectAllMatching();
      expect(view.shell.selection.value!.allMatching.value).toBe(true);
      const source = view.shell.source.value;
      if (query === "search") source.setSearch("Bea");
      if (query === "extra") source.setExtra("name", "Bea");
      if (query === "tree")
        source.setFilterTree?.({
          combinator: "and",
          conditions: [{ key: "name", op: "eq", value: "Bea" }],
        });
      if (query === "group") source.setGroupBy?.("name");
      await nextTick();
      expect(view.shell.selection.value!.allMatching.value).toBe(false);
      expect(view.shell.selection.value!.selectedCount.value).toBe(0);
      expect(view.updates).toEqual([[]]);
    }
  );

  it("requests a query reset once while preserving a controlled host refusal", async () => {
    const view = mount({ controlled: ["a"] });
    view.shell.source.value.setSearch("Bea");
    await nextTick();
    expect(view.updates).toEqual([[]]);
    expect([...view.shell.selection.value!.selectedIds.value]).toEqual(["a"]);
  });

  it.each([
    { ids: ["b"], queryFirst: true },
    { ids: ["b"], queryFirst: false },
    { ids: [], queryFirst: true },
    { ids: [], queryFirst: false },
  ])(
    "narrows all-matching while retaining restored host ids: %j",
    async ({ ids, queryFirst }) => {
      const view = mount({ controlled: ["a"], accept: true });
      const selection = view.shell.selection.value!;
      selection.selectAllMatching();
      expect(selection.allMatching.value).toBe(true);
      if (queryFirst) view.shell.source.value.setSearch("Bea");
      view.selectedIds.value = ids;
      if (!queryFirst) view.shell.source.value.setSearch("Bea");
      // A bulk action invoked in the same turn must already see concrete ids.
      expect(selection.state.value.allMatching).toBe(false);
      await nextTick();
      expect([...selection.selectedIds.value]).toEqual(ids);
      expect(selection.allMatching.value).toBe(false);
      expect(view.updates).toEqual([]);
    }
  );

  it("narrows all-matching when the host replaces ids without changing the query", async () => {
    const view = mount({ controlled: ["a"] });
    const selection = view.shell.selection.value!;
    selection.selectAllMatching();
    expect(selection.allMatching.value).toBe(true);
    view.selectedIds.value = ["b"];
    expect(selection.state.value.allMatching).toBe(false);
    await nextTick();
    expect([...selection.selectedIds.value]).toEqual(["b"]);
    expect(view.updates).toEqual([]);
  });

  it("keeps selection through paging and sorting, and avoids empty query-reset callbacks", async () => {
    const view = mount();
    view.shell.source.value.setSearch("a");
    await nextTick();
    expect(view.updates).toEqual([]);
    view.shell.selection.value!.toggle("a");
    view.shell.selection.value!.selectAllMatching();
    view.shell.source.value.setSort("name", "desc");
    view.shell.source.value.setPage(2);
    await nextTick();
    expect(view.updates).toEqual([["a"]]);
    expect(view.shell.selection.value!.allMatching.value).toBe(true);
    expect([...view.shell.selection.value!.selectedIds.value]).toEqual(["a"]);
  });

  it("aliases the actual state/action and retains full native attrs unchanged", () => {
    const onChange = vi.fn();
    const attrs: SelectionCheckboxAttrs = {
      type: "checkbox",
      checked: true,
      indeterminate: true,
      onChange,
      "aria-label": "Select row",
    };
    const control = selectionCheckboxControl(attrs);
    expect(control.attrs).toBe(attrs);
    expect(control).toMatchObject({
      checked: true,
      indeterminate: true,
      onToggle: onChange,
    });
    control.onToggle();
    expect(onChange).toHaveBeenCalledExactlyOnceWith();
    expect(
      selectionCheckboxControl({ checked: false, onChange }).indeterminate
    ).toBe(false);
  });

  it("removes only selection-owned value/change wiring and preserves semantic target attributes", () => {
    const onKeydown = vi.fn();
    const onBlur = vi.fn();
    const ref = vi.fn();
    const onChange = vi.fn();
    const remaining: Attrs = {
      type: "checkbox",
      id: "row-a",
      name: "selectedRows",
      value: "a",
      form: "selection-form",
      required: true,
      disabled: true,
      tabindex: -1,
      "aria-label": "Select Ada",
      "aria-describedby": "selection-hint",
      "data-adapttable-part": "checkbox",
      class: "kit-control",
      style: { accentColor: "blue" },
      onKeydown,
      onBlur,
      ref,
    };
    const attrs = {
      ...remaining,
      checked: true,
      indeterminate: true,
      onChange,
    };
    const projected = selectionCheckboxInputAttrs(attrs);
    expect(projected).toEqual(remaining);
    expect(projected.onKeydown).toBe(onKeydown);
    expect(projected.ref).toBe(ref);
    expect(attrs.onChange).toBe(onChange);
    expect(attrs.checked).toBe(true);
  });

  it.each([false, true])(
    "uses one update event for a dual-emitting Vue component, mobile=%s",
    async (mobile) => {
      const view = mount({ mobile });
      view.firstRow().click();
      await nextTick();
      expect(view.updates).toEqual([["a"]]);
      expect(view.firstRow().checked).toBe(true);
      // Only the clicked row redraws, so its newest control is the last.
      const rowControls = view.controls().filter((control) => !control.header);
      expect(rowControls.at(-1)?.checked).toBe(true);
      expect(view.firstRow().getAttribute("data-adapttable-part")).toBe(
        "checkbox"
      );
      expect(view.firstRow().getAttribute("aria-label")).toBeTruthy();
      view.firstRow().click();
      await nextTick();
      expect(view.updates).toEqual([["a"], []]);
      expect(view.firstRow().checked).toBe(false);
    }
  );

  it("proves retaining the legacy change subscription would dispatch twice", async () => {
    const view = mount({ legacyChange: true });
    view.firstRow().click();
    await nextTick();
    expect(view.updates).toEqual([["a"], []]);
    expect(view.firstRow().checked).toBe(false);
  });

  it("keeps mixed-header toggles and off-page selection in the existing neutral contract", async () => {
    const view = mount({ defaultSelectedIds: ["a", "off-page"] });
    const header = checkbox(view.root, "thead input");
    expect(header.checked).toBe(false);
    expect(header.indeterminate).toBe(true);
    expect(view.controls().find((control) => control.header)).toMatchObject({
      checked: false,
      indeterminate: true,
    });
    header.click();
    await nextTick();
    expect(view.updates).toEqual([["a", "off-page", "b"]]);
    expect(header.checked).toBe(true);
    expect(header.indeterminate).toBe(false);
    header.click();
    await nextTick();
    expect(view.updates).toEqual([["a", "off-page", "b"], ["off-page"]]);
    expect(header.checked).toBe(false);
    expect(header.indeterminate).toBe(false);
  });

  it.each([false, true])(
    "preserves a controlled mixed header when host acceptance is %s",
    async (accept) => {
      const view = mount({ controlled: ["a", "off-page"], accept });
      const header = checkbox(view.root, "thead input");
      expect(header.indeterminate).toBe(true);
      header.click();
      await nextTick();
      expect(header.checked).toBe(accept);
      expect(header.indeterminate).toBe(!accept);
      header.click();
      await nextTick();
      expect(view.updates).toEqual(
        accept
          ? [["a", "off-page", "b"], ["off-page"]]
          : [
              ["a", "off-page", "b"],
              ["a", "off-page", "b"],
            ]
      );
      expect(header.checked).toBe(false);
      expect(header.indeterminate).toBe(!accept);
    }
  );

  it.each([false, true])(
    "preserves controlled host rejection, mobile=%s",
    async (mobile) => {
      const view = mount({ mobile, controlled: [] });
      view.firstRow().click();
      await nextTick();
      view.firstRow().click();
      await nextTick();
      expect(view.updates).toEqual([["a"], ["a"]]);
      expect(view.firstRow().checked).toBe(false);
      expect([...view.shell.selection.value!.selectedIds.value]).toEqual([]);
      view.selectedIds.value = ["a"];
      await nextTick();
      expect(view.firstRow().checked).toBe(true);
      expect(view.updates).toHaveLength(2);
    }
  );

  it.each([false, true])(
    "preserves controlled host acceptance, mobile=%s",
    async (mobile) => {
      const view = mount({ mobile, controlled: [], accept: true });
      view.firstRow().click();
      await nextTick();
      expect(view.firstRow().checked).toBe(true);
      view.firstRow().click();
      await nextTick();
      expect(view.updates).toEqual([["a"], []]);
      expect(view.firstRow().checked).toBe(false);
    }
  );

  it("keeps disabled controls inert and forwards keyboard/form semantics to the checkbox", async () => {
    const onKeydown = vi.fn();
    const view = mount({
      attrs: {
        disabled: true,
        name: "selectedRows",
        value: "a",
        form: "selection-form",
        required: true,
        "aria-describedby": "hint",
        onKeydown,
      },
    });
    const row = view.firstRow();
    expect(row.disabled).toBe(true);
    expect(row.name).toBe("selectedRows");
    expect(row.value).toBe("a");
    expect(row.getAttribute("form")).toBe("selection-form");
    expect(row.required).toBe(true);
    expect(row.getAttribute("aria-describedby")).toBe("hint");
    row.click();
    await nextTick();
    expect(view.updates).toEqual([]);
    row.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onKeydown).toHaveBeenCalledOnce();
  });

  it("does not turn duplicate model payloads into value-setter or deduplication semantics", () => {
    const scope = effectScope();
    cleanup.push(() => scope.stop());
    const updates: string[][] = [];
    const selection = scope.run(() =>
      useRowSelection({
        rows: data,
        rowKey: (row) => row.id,
        onSelectionChange: (ids) => updates.push(ids),
      })
    );
    if (!selection) throw new Error("Missing selection");
    const control = selectionCheckboxControl(selection.rowCheckboxAttrs("a"));
    const modelInteraction: (checked: boolean) => void = control.onToggle;
    modelInteraction(false);
    modelInteraction(false);
    expect(updates).toEqual([["a"], []]);
    expect(selection.isSelected("a")).toBe(false);
  });

  it("preserves empty-header requests and narrowing of all-matching scope", () => {
    const scope = effectScope();
    cleanup.push(() => scope.stop());
    const updates: string[][] = [];
    const selection = scope.run(() =>
      useRowSelection({
        rows: [] as Row[],
        rowKey: (row) => row.id,
        acrossPages: true,
        defaultSelectedIds: ["off-page"],
        onSelectionChange: (ids) => updates.push(ids),
      })
    );
    if (!selection) throw new Error("Missing selection");
    selection.selectAllMatching();
    expect(selection.allMatching.value).toBe(true);
    const control = selectionCheckboxControl(selection.headerCheckboxAttrs());
    control.onToggle();
    expect(selection.allMatching.value).toBe(false);
    expect(updates).toEqual([["off-page"]]);
    expect([...selection.selectedIds.value]).toEqual(["off-page"]);
  });
});

it("lets a custom card reuse prepared native values while selection remains outside its body", async () => {
  const card = vi.fn(
    (context: Parameters<NonNullable<TableChromeSlots<Row>["card"]>>[0]) =>
      h(
        "section",
        { "data-custom-body": context.row.id },
        context.fields.map((field) =>
          h("div", { key: field.column.key }, [field.value])
        )
      )
  );
  const { root } = mount({ mobile: true, card });
  await nextTick();
  expect(root.querySelector('[data-custom-body="a"]')?.textContent).toBe("Ada");
  expect(
    root.querySelectorAll('[data-adapttable-part="card"] input')
  ).toHaveLength(2);
  expect(card).toHaveBeenCalledWith(
    expect.objectContaining({
      row: data[0],
      index: 0,
      selected: false,
      expanded: false,
    })
  );
});
