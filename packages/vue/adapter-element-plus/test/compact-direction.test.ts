import type { FilterDef, FilterFormSource } from "@adapttable/vue";
import { resolveLabels } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { computed, h, nextTick, shallowRef } from "vue";

import { FilterHeaderControl, FilterHeaderRow } from "../src/header-filters";
import { mount, node } from "./mount";

interface Row {
  name: string;
}
const labels = resolveLabels(undefined);
const def: FilterDef<Row> = {
  key: "name",
  type: "multiSelect",
  label: "Names",
  options: [{ value: "Ada", label: "Ada" }],
};
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
function form() {
  const extra = shallowRef<FilterFormSource<Row>["extra"]>({ name: ["Ada"] });
  const setExtra = vi.fn<FilterFormSource<Row>["setExtra"]>((key, value) => {
    extra.value = { ...extra.value, [key]: value };
  });
  const setExtras = vi.fn<FilterFormSource<Row>["setExtras"]>();
  const source = computed<FilterFormSource<Row>>(() => ({
    extra: extra.value,
    setExtra,
    setExtras,
  }));
  return { extra, source, setExtra, setExtras };
}
describe("Element Plus compact popup direction", () => {
  for (const row of [false, true]) {
    it(`updates RTL to LTR to RTL without replacing its open popup or selection, row=${row}`, async () => {
      const state = form();
      const dir = shallowRef<"ltr" | "rtl">("rtl");
      const { root } = mount(() =>
        row
          ? h("table", [
              h("thead", [
                h(FilterHeaderRow<Row>, {
                  dir: dir.value,
                  columns: [{ key: "name" }],
                  defs: [def],
                  source: state.source.value,
                  labels,
                }),
              ]),
            ])
          : h(FilterHeaderControl<Row>, {
              dir: dir.value,
              def,
              source: state.source.value,
              labels,
            })
      );
      await tick();
      const trigger = node<HTMLButtonElement>(
        root,
        part("filter-header-input")
      );
      trigger.click();
      await tick();
      const menu = node<HTMLElement>(document, part("filter-header-menu"));
      const popup = menu.closest<HTMLElement>('[role="dialog"]');
      expect(popup).not.toBeNull();
      const input = node<HTMLInputElement>(menu, 'input[type="checkbox"]');
      expect(root.contains(menu)).toBe(false);
      for (const direction of ["rtl", "ltr", "rtl"] as const) {
        dir.value = direction;
        await tick();
        expect(node(root, part("filter-header-input"))).toBe(trigger);
        expect(node(document, part("filter-header-menu"))).toBe(menu);
        expect(menu.closest('[role="dialog"]')).toBe(popup);
        expect(popup?.style.direction).toBe(direction);
        expect(menu.getAttribute("dir")).toBe(direction);
        expect(trigger.getAttribute("dir")).toBe(direction);
        expect(trigger.getAttribute("aria-expanded")).toBe("true");
        expect(input.checked).toBe(true);
        expect(state.extra.value.name).toEqual(["Ada"]);
      }
      expect(state.setExtra).not.toHaveBeenCalled();
      expect(state.setExtras).not.toHaveBeenCalled();
      input.click();
      await tick();
      expect(state.setExtra).toHaveBeenCalledExactlyOnceWith("name", undefined);
      expect(input.checked).toBe(false);
      expect(node(document, part("filter-header-menu"))).toBe(menu);
    });
  }
  it("resolves the actual trigger's computed direction on each omitted-dir opening", async () => {
    const state = form();
    const className = shallowRef("computed-rtl");
    const style = document.createElement("style");
    style.textContent =
      ".computed-rtl { direction: rtl; } .computed-ltr { direction: ltr; }";
    document.head.append(style);
    try {
      const { root } = mount(() =>
        h(FilterHeaderControl<Row>, {
          def,
          source: state.source.value,
          labels,
          className: className.value,
        })
      );
      await tick();
      const trigger = node<HTMLButtonElement>(
        root,
        part("filter-header-input")
      );
      expect(trigger.hasAttribute("dir")).toBe(false);
      for (const direction of ["rtl", "ltr", "rtl"] as const) {
        className.value = `computed-${direction}`;
        await tick();
        expect(getComputedStyle(trigger).direction).toBe(direction);
        trigger.click();
        await tick();
        const menu = node<HTMLElement>(document, part("filter-header-menu"));
        expect(
          menu.closest<HTMLElement>('[role="dialog"]')?.style.direction
        ).toBe(direction);
        expect(node<HTMLInputElement>(menu, "input").checked).toBe(true);
        trigger.click();
        await tick();
        await vi.waitFor(() =>
          expect(document.querySelector(part("filter-header-menu"))).toBeNull()
        );
      }
      expect(state.setExtra).not.toHaveBeenCalled();
    } finally {
      style.remove();
    }
  });
});
