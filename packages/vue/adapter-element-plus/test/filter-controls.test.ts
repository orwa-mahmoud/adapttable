import type { FilterDef, FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { computed, h, nextTick, shallowRef } from "vue";

import { FilterField } from "../src/filters";
import { mount, node } from "./mount";

interface Row {
  id: string;
  name: string;
  active: boolean;
  amount: number;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", active: true, amount: 2 },
  { id: "g", name: "Grace", active: false, amount: 3 },
];
const labels = resolveLabels(undefined);
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
async function input(element: HTMLInputElement, value: string) {
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
function field(def: FilterDef<Row>, accept = true) {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  const setExtra = vi.fn<FilterFormSource<Row>["setExtra"]>((key, value) => {
    if (accept) extra.value = { ...extra.value, [key]: value };
  });
  const setExtras = vi.fn<FilterFormSource<Row>["setExtras"]>((patch) => {
    if (accept) extra.value = { ...extra.value, ...patch };
  });
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    setExtra,
    setExtras,
    allFilteredRows: rows,
  }));
  const view = mount(() =>
    h(FilterField<Row>, {
      def,
      source: source.value,
      labels,
      classNames: {
        filterInput: "host-field",
        filterCheckbox: "host-checkbox",
      },
    })
  );
  return { ...view, extra, setExtra, setExtras };
}

describe("Element Plus filter fields", () => {
  it("keeps the native text name and rejects exactly one host write", async () => {
    const state = field({ key: "name", type: "text" }, false);
    await tick();
    const control = node<HTMLInputElement>(
      state.root,
      'input[data-adapttable-part="filter-input"]'
    );
    expect(control.getAttribute("aria-label")).toBe("Name");
    expect(control.closest(".el-input.host-field")).not.toBeNull();
    await input(control, "Ada");
    expect(control.value).toBe("");
    expect(state.setExtras).toHaveBeenCalledTimes(1);
  });

  it("renders real multiple-choice checkboxes and restores a rejected host value", async () => {
    const state = field(
      {
        key: "name",
        type: "multiSelect",
        options: [
          { value: "Ada", label: "Ada" },
          { value: "Grace", label: "Grace" },
        ],
      },
      false
    );
    await tick();
    const control = node<HTMLInputElement>(
      state.root,
      'input[type="checkbox"]'
    );
    expect(control.closest("label.el-checkbox.host-checkbox")).not.toBeNull();
    control.click();
    await tick();
    expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", ["Ada"]);
    expect(control.checked).toBe(false);
  });

  it("accepts multi-select values through the binding without changing raw rows", async () => {
    const state = field({
      key: "name",
      type: "multiSelect",
      options: [{ value: "Ada", label: "Ada" }],
    });
    await tick();
    const control = node<HTMLInputElement>(
      state.root,
      'input[type="checkbox"]'
    );
    control.click();
    await tick();
    expect(control.checked).toBe(true);
    expect(state.extra.value.name).toEqual(["Ada"]);
    expect(rows[0]?.name).toBe("Ada");
    expect(state.setExtra).toHaveBeenCalledTimes(1);
  });

  it("uses the binding checklist search/count with real kit controls", async () => {
    const state = field({ key: "name", type: "checklist" });
    await tick();
    const search = node<HTMLInputElement>(
      state.root,
      'input[data-adapttable-part="filter-checklist-search"]'
    );
    expect(search.closest(".el-input")).not.toBeNull();
    await input(search, "Ada");
    expect(state.root.querySelectorAll('input[type="checkbox"]')).toHaveLength(
      1
    );
    const checkbox = node<HTMLInputElement>(
      state.root,
      'input[type="checkbox"]'
    );
    checkbox.click();
    await tick();
    expect(state.extra.value.name).toEqual(["Ada"]);
    expect(checkbox.checked).toBe(true);
    expect(
      node(state.root, '[data-adapttable-part="filter-checklist-count"]')
        .textContent
    ).toBe("1");
    expect(state.setExtra).toHaveBeenCalledTimes(1);
  });
});
