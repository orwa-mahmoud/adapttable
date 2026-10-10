import type { FilterDef } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { describe, expect, it } from "vitest";
import { defineComponent, h, KeepAlive, shallowRef } from "vue";

import { FilterHeaderControl, FilterHeaderRow } from "../src/header-filters";
import {
  choose,
  escape,
  find,
  mount,
  part,
  type Row,
  settle,
  source,
  tick,
  write,
} from "./filter-helpers";

const labels = resolveLabels(undefined);
describe("Naive compact header filters", () => {
  it("keeps search type, consumer attributes and classes on the real input", async () => {
    const state = source(false);
    const view = mount(() =>
      h(FilterHeaderControl<Row>, {
        def: { key: "name", type: "text" },
        source: state.value.value,
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
    expect(input.id).toBe("compact");
    expect(input.getAttribute("data-consumer")).toBe("yes");
    expect(input.classList.contains("compact-name")).toBe(true);
    await write(input, "Rejected");
    expect(input.value).toBe("");
    expect(state.setExtras).toHaveBeenCalledOnce();
  });

  it("uses Naive single/boolean selects and binding-owned range writes", async () => {
    const state = source();
    const def = shallowRef<FilterDef<Row>>({
      key: "name",
      type: "select",
      options: [{ value: "Ada", label: "Ada" }],
    });
    const view = mount(() =>
      h(FilterHeaderControl<Row>, {
        def: def.value,
        source: state.value.value,
        labels,
        className: "choice",
      })
    );
    await choose(view.host, "Ada");
    expect(state.extra.value.name).toEqual(["Ada"]);
    def.value = { key: "active", type: "boolean" };
    await tick();
    await choose(view.host, labels.boolFalse);
    expect(state.extra.value.active).toBe("false");
    expect(
      find(view.host, part("filter-header-input")).classList.contains(
        "n-select"
      )
    ).toBe(true);
    state.extra.value = { amountMin: 2, amountMax: 5, amountOp: "between" };
    def.value = { key: "amount", type: "numberRange" };
    await tick();
    const pair = find(view.host, part("filter-header-input"));
    expect(pair.tagName).toBe("SPAN");
    const inputs = pair.querySelectorAll<HTMLInputElement>(
      'input[type="number"]'
    );
    expect(inputs).toHaveLength(2);
    await write(inputs[0]!, "0");
    await write(inputs[1]!, "9");
    expect(state.extra.value.amountMin).toBe("0");
    expect(state.extra.value.amountMax).toBe("9");
  });

  it("keeps the multi-choice popover controlled and closes it on KeepAlive deactivation", async () => {
    const state = source();
    const shown = shallowRef(true);
    const Child = defineComponent(
      () => () =>
        h(FilterHeaderControl<Row>, {
          def: {
            key: "name",
            type: "multiSelect",
            options: [{ value: "Ada", label: "Ada" }],
          },
          source: state.value.value,
          labels,
          className: "multi-trigger",
          menuClassName: "multi-menu",
        })
    );
    const view = mount(() =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Child) : h("div")) })
    );
    const trigger = find<HTMLButtonElement>(
      view.host,
      part("filter-header-input")
    );
    expect(trigger.tagName).toBe("BUTTON");
    trigger.click();
    await tick();
    const menu = find(view.host, part("filter-header-menu"));
    expect(menu.classList.contains("n-popover")).toBe(true);
    expect(menu.classList.contains("multi-menu")).toBe(true);
    const checkbox = find(menu, '[role="checkbox"]');
    checkbox.click();
    await tick();
    expect(state.extra.value.name).toEqual(["Ada"]);
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
    checkbox.focus();
    await escape(checkbox);
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    await tick();
    const stale = find(view.host, '[role="checkbox"]');
    shown.value = false;
    await tick();
    await settle();
    const count = state.setExtra.mock.calls.length;
    stale.click();
    await tick();
    expect(state.setExtra).toHaveBeenCalledTimes(count);
    shown.value = true;
    await tick();
    expect(
      find(view.host, part("filter-header-input")).getAttribute("aria-expanded")
    ).toBe("false");
  });

  it("aligns a semantic row with projected columns, selection and spacer cells", async () => {
    const state = source();
    const view = mount(() =>
      h("table", [
        h("thead", [
          h(FilterHeaderRow<Row>, {
            columns: [{ key: "amount" }, { key: "name" }],
            defs: [{ key: "name", type: "text" }],
            source: state.value.value,
            labels,
            selection: true,
            showActions: true,
            columnSpacers: { start: 40, end: 90 },
            classNames: { filterHeaderInput: "aligned-input" },
          }),
        ]),
      ])
    );
    const row = find(view.host, part("filter-header-row"));
    expect(row.tagName).toBe("TR");
    expect(row.querySelectorAll("th,td")).toHaveLength(6);
    const name = find(row, '[data-column-key="name"]');
    const input = find<HTMLInputElement>(name, 'input[type="search"]');
    expect(input.classList.contains("aligned-input")).toBe(true);
    await write(input, "Grace");
    expect(state.extra.value.name).toBe("Grace");
    expect(find(row, '[data-column-key="amount"]').children).toHaveLength(0);
  });
});
