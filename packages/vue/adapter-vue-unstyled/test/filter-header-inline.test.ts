import {
  type FilterDef,
  type FilterFormSource,
  resolveLabels,
} from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { computed, defineComponent, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../src";
import { filters } from "../src/filters";
import {
  FilterHeaderControl,
  FilterHeaderRow,
  headerFilters,
} from "../src/header-filters";
import { find, mountNative, part, tick, write } from "./filter-editing-helpers";

interface Row {
  name: string;
  active: boolean;
  amount: number;
}
const labels = resolveLabels(undefined);
function form() {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({});
  let accept = true;
  const setExtra = vi.fn<FilterFormSource<Row>["setExtra"]>((key, value) => {
    if (accept) extra.value = { ...extra.value, [key]: value };
  });
  const setExtras = vi.fn((patch: FilterFormSource<Row>["extra"]) => {
    if (accept) extra.value = { ...extra.value, ...patch };
  });
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    setExtra,
    setExtras,
  }));
  return {
    source,
    extra,
    setExtra,
    setExtras,
    reject: () => {
      accept = false;
    },
  };
}
describe("native compact header filters", () => {
  it("keeps the funnel class on its button and the inline class off that target", () => {
    const view = mountNative(() =>
      h(DataTable<Row>, {
        data: [{ name: "Ada", amount: 2, active: true }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.name,
        urlSync: false,
        features: [
          filters<Row>([{ key: "name", type: "text" }]),
          headerFilters(),
        ],
        classNames: {
          filterHeaderTrigger: "funnel-only",
          filterHeaderInput: "inline-only",
        },
      })
    );
    const button = find(view.host, part("filter-header-trigger"));
    expect(button.tagName).toBe("BUTTON");
    expect(button.classList.contains("funnel-only")).toBe(true);
    expect(button.classList.contains("inline-only")).toBe(false);
    expect(view.host.querySelector(".inline-only")).toBeNull();
  });

  it("places the compact hook on a real search field and reflects host rejection", async () => {
    const f = form();
    const view = mountNative(() =>
      h(FilterHeaderControl<Row>, {
        def: { key: "name", type: "text", label: "Name" },
        source: f.source.value,
        labels,
        className: "compact-name",
        id: "compact",
        "data-consumer": "yes",
      })
    );
    const input = find<HTMLInputElement>(
      view.host,
      part("filter-header-input")
    );
    expect(input.tagName).toBe("INPUT");
    expect(input.type).toBe("search");
    expect(input.className).toBe("compact-name");
    expect(input.id).toBe("compact");
    expect(input.getAttribute("data-consumer")).toBe("yes");
    await write(input, "Ada");
    expect(f.extra.value.name).toBe("Ada");
    expect(input.value).toBe("Ada");
    f.reject();
    await write(input, "rejected");
    expect(f.extra.value.name).toBe("Ada");
    expect(input.value).toBe("Ada");
  });

  it("renders real single and boolean selects with neutral values", async () => {
    const f = form();
    const def = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "select",
      options: [{ value: "Ada", label: "Ada" }],
    });
    const view = mountNative(() =>
      h(FilterHeaderControl<Row>, {
        def: def.value,
        source: f.source.value,
        labels,
        className: "choice",
      })
    );
    let select = find<HTMLSelectElement>(
      view.host,
      part("filter-header-input")
    );
    expect(select.tagName).toBe("SELECT");
    await write(select, "Ada", "change");
    expect(f.extra.value.name).toEqual(["Ada"]);
    expect(select.value).toBe("Ada");
    def.value = { key: "active", type: "boolean" };
    await tick();
    select = find<HTMLSelectElement>(view.host, part("filter-header-input"));
    await write(select, "false", "change");
    expect(f.extra.value.active).toBe("false");
    expect(select.className).toBe("choice");
  });

  it("puts the range hook on the pair and forwards both bound changes", async () => {
    const f = form();
    f.extra.value = { amountMin: 2, amountMax: 5, amountOp: "between" };
    const view = mountNative(() =>
      h(FilterHeaderControl<Row>, {
        def: { key: "amount", type: "numberRange" },
        source: f.source.value,
        labels,
        className: "range-pair",
      })
    );
    const pair = find(view.host, part("filter-header-input"));
    expect(pair.tagName).toBe("SPAN");
    expect(pair.className).toBe("range-pair");
    const inputs = pair.querySelectorAll<HTMLInputElement>("input");
    expect(inputs).toHaveLength(2);
    await write(inputs[0]!, "0");
    await write(inputs[1]!, "9");
    expect(f.extra.value.amountMin).toBe("0");
    expect(f.extra.value.amountMax).toBe("9");
    expect(pair.querySelector(part("filter-header-input"))).toBeNull();
  });

  it("uses a real disclosure, restores summary focus on Escape, and suspends its controls", async () => {
    const f = form();
    const shown = shallowRef(true);
    const Child = defineComponent(
      () => () =>
        h(FilterHeaderControl<Row>, {
          def: {
            key: "name",
            type: "multiSelect",
            options: [{ value: "Ada", label: "Ada" }],
          },
          source: f.source.value,
          labels,
          className: "multi-trigger",
          menuClassName: "multi-menu",
        })
    );
    const view = mountNative(() =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Child) : h("div")) })
    );
    const details = find<HTMLDetailsElement>(view.host, "details");
    const summary = find<HTMLElement>(details, "summary");
    const menu = find(details, part("filter-header-menu"));
    expect(summary.className).toBe("multi-trigger");
    expect(menu.tagName).toBe("FIELDSET");
    expect(menu.className).toBe("multi-menu");
    details.open = true;
    const checkbox = find<HTMLInputElement>(menu, "input");
    checkbox.click();
    await tick();
    expect(f.extra.value.name).toEqual(["Ada"]);
    checkbox.focus();
    checkbox.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(details.open).toBe(false);
    expect(document.activeElement).toBe(summary);
    details.open = true;
    shown.value = false;
    await tick();
    expect(details.open).toBe(false);
    const count = f.setExtra.mock.calls.length;
    checkbox.click();
    expect(f.setExtra).toHaveBeenCalledTimes(count);
    shown.value = true;
    await tick();
    expect(find<HTMLDetailsElement>(view.host, "details").open).toBe(false);
  });

  it("renders an actual aligned row with controls under the matching projected columns", async () => {
    const f = form();
    const view = mountNative(() =>
      h("table", [
        h("thead", [
          h(FilterHeaderRow<Row>, {
            columns: [{ key: "amount" }, { key: "name" }],
            defs: [{ key: "name", type: "text", label: "Name" }],
            source: f.source.value,
            labels,
            selection: true,
            showActions: true,
            columnSpacers: { start: 40, end: 90 },
            classNames: {
              filterHeaderRow: "filter-row",
              filterHeaderCell: "filter-cell",
              filterHeaderInput: "filter-input",
              headerCell: "header",
            },
          }),
        ]),
      ])
    );
    const row = find(view.host, part("filter-header-row"));
    expect(row.tagName).toBe("TR");
    expect(row.className).toBe("filter-row");
    expect(row.children).toHaveLength(6);
    const name = find(row, "[data-column-key='name']");
    expect(name.className).toBe("header filter-cell");
    expect(name.hasAttribute("data-sticky")).toBe(false);
    const input = find<HTMLInputElement>(name, "input");
    expect(input.className).toBe("filter-input");
    await write(input, "Grace");
    expect(f.extra.value.name).toBe("Grace");
    expect(find(row, "[data-column-key='amount']").children).toHaveLength(0);
  });

  it("keeps a multi menu open across source snapshots and uses the current host writer", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const source = shallowRef<FilterFormSource<Row>>({
      extra: {},
      setExtra: first,
      setExtras: vi.fn(),
    });
    const view = mountNative(() =>
      h(FilterHeaderControl<Row>, {
        def: {
          key: "name",
          type: "multiSelect",
          options: [{ value: "Ada", label: "Ada" }],
        },
        source: source.value,
        labels,
      })
    );
    const details = find<HTMLDetailsElement>(view.host, "details");
    details.open = true;
    source.value = {
      extra: { name: ["Ada"] },
      setExtra: second,
      setExtras: vi.fn(),
    };
    await tick();
    expect(details.open).toBe(true);
    const checkbox = find<HTMLInputElement>(details, "input");
    expect(checkbox.checked).toBe(true);
    checkbox.click();
    expect(second).toHaveBeenCalledExactlyOnceWith("name", undefined);
    expect(first).not.toHaveBeenCalled();
  });
});
