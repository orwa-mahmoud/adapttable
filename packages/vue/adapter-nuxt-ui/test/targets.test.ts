import type { ElementRef } from "@adapttable/vue";
import UApp from "@nuxt/ui/components/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef, type VNodeChild } from "vue";

import { nuxtButton } from "../src/controls/button";
import NuxtInput from "../src/controls/NuxtInput.vue";
import NuxtSelect from "../src/controls/NuxtSelect.vue";
import NuxtTableRoot from "../src/controls/NuxtTableRoot.vue";
import { nuxtCard, tablePart } from "../src/controls/tablePart";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
});
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}
async function mount(render: () => VNodeChild) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp({
    render: () => h(UApp, { toaster: null, dir: "rtl" }, { default: render }),
  });
  app.use(ui);
  app.mount(root);
  stops.push(() => {
    app.unmount();
    root.remove();
  });
  await settle();
  return root;
}

describe("public Nuxt component targets", () => {
  it.each(["focusRef", "attrs", "both"] as const)(
    "replaces and removes input, select and button callbacks without remounting (%s)",
    async (transport) => {
      const inputA = vi.fn<ElementRef<HTMLInputElement>>();
      const inputB = vi.fn<ElementRef<HTMLInputElement>>();
      const selectA = vi.fn<ElementRef<HTMLButtonElement>>();
      const selectB = vi.fn<ElementRef<HTMLButtonElement>>();
      const buttonA = vi.fn<ElementRef<HTMLButtonElement>>();
      const buttonB = vi.fn<ElementRef<HTMLButtonElement>>();
      const inputOwner = shallowRef<ElementRef<HTMLInputElement> | undefined>(
        inputA
      );
      const selectOwner = shallowRef<ElementRef<HTMLButtonElement> | undefined>(
        selectA
      );
      const buttonOwner = shallowRef<ElementRef<HTMLButtonElement> | undefined>(
        buttonA
      );
      const root = await mount(() =>
        h("div", [
          h(NuxtInput, {
            control: {
              value: "query",
              label: "Find",
              attrs: {
                ref: transport === "focusRef" ? undefined : inputOwner.value,
              },
              onChange: vi.fn(),
              focusRef: transport === "attrs" ? undefined : inputOwner.value,
            },
          }),
          h(NuxtSelect, {
            control: {
              value: "a",
              label: "Choice",
              attrs: {
                ref: transport === "focusRef" ? undefined : selectOwner.value,
              },
              options: [{ value: "a", label: "A" }],
              onChange: vi.fn(),
              focusRef: transport === "attrs" ? undefined : selectOwner.value,
            },
          }),
          nuxtButton({
            label: "Apply",
            attrs: { ref: buttonOwner.value, "data-action": "apply" },
          }),
        ])
      );
      const input = root.querySelector("input");
      const select = root.querySelector('button[role="combobox"]');
      const button = root.querySelector('button[data-action="apply"]');
      expect(inputA.mock.calls).toEqual([[input]]);
      expect(selectA.mock.calls).toEqual([[select]]);
      expect(buttonA.mock.calls).toEqual([[button]]);
      inputOwner.value = inputB;
      selectOwner.value = selectB;
      buttonOwner.value = buttonB;
      await settle();
      expect(inputA.mock.calls).toEqual([[input], [null]]);
      expect(selectA.mock.calls).toEqual([[select], [null]]);
      expect(buttonA.mock.calls).toEqual([[button], [null]]);
      expect(inputB.mock.calls).toEqual([[input]]);
      expect(selectB.mock.calls).toEqual([[select]]);
      expect(buttonB.mock.calls).toEqual([[button]]);
      inputOwner.value = undefined;
      selectOwner.value = undefined;
      buttonOwner.value = undefined;
      await settle();
      expect(inputB.mock.calls).toEqual([[input], [null]]);
      expect(selectB.mock.calls).toEqual([[select], [null]]);
      expect(buttonB.mock.calls).toEqual([[button], [null]]);
      expect(root.querySelector("input")).toBe(input);
      expect(root.querySelector('button[role="combobox"]')).toBe(select);
      expect(root.querySelector('button[data-action="apply"]')).toBe(button);
      stops.pop()?.();
      expect(buttonB).toHaveBeenCalledTimes(2);
    }
  );

  it("keeps native table and Prose part semantics, spans, listeners and public refs", async () => {
    const tableA = vi.fn<ElementRef<HTMLElement>>();
    const tableB = vi.fn<ElementRef<HTMLElement>>();
    const cellA = vi.fn<ElementRef<HTMLElement>>();
    const cellB = vi.fn<ElementRef<HTMLElement>>();
    const cardA = vi.fn<ElementRef<HTMLElement>>();
    const cardB = vi.fn<ElementRef<HTMLElement>>();
    const tableOwner = shallowRef<ElementRef<HTMLElement> | undefined>(tableA);
    const cellOwner = shallowRef<ElementRef<HTMLElement> | undefined>(cellA);
    const cardOwner = shallowRef<ElementRef<HTMLElement> | undefined>(cardA);
    const activate = vi.fn();
    const root = await mount(() =>
      h("div", [
        h(
          NuxtTableRoot,
          {
            attrs: {
              ref: tableOwner.value,
              role: "grid",
              "aria-rowcount": 4,
              "data-adapttable-part": "table",
            },
          },
          () => [
            tablePart("thead", { "data-adapttable-part": "thead" }, [
              tablePart("tr", {}, [
                tablePart(
                  "th",
                  { scope: "col", "aria-sort": "ascending" },
                  "Name"
                ),
              ]),
            ]),
            tablePart("tbody", { "data-adapttable-part": "tbody" }, [
              tablePart("tr", { "data-row-id": "row-a" }, [
                tablePart(
                  "td",
                  {
                    ref: cellOwner.value,
                    colspan: 2,
                    rowspan: 3,
                    role: "gridcell",
                    tabindex: 0,
                    class: "cell-paint",
                    "data-adapttable-part": "cell",
                    onClick: activate,
                  },
                  "Ada"
                ),
              ]),
            ]),
          ]
        ),
        nuxtCard(
          {
            ref: cardOwner.value,
            role: "listitem",
            "data-adapttable-part": "card",
          },
          "Mobile row"
        ),
      ])
    );
    const table = root.querySelector("table");
    const cell = root.querySelector("td");
    const card = root.querySelector("article");
    expect(tableA.mock.calls).toEqual([[table]]);
    expect(cellA.mock.calls).toEqual([[cell]]);
    expect(cardA.mock.calls).toEqual([[card]]);
    expect(
      root.querySelector("table > thead > tr > th")?.getAttribute("aria-sort")
    ).toBe("ascending");
    expect(root.querySelector("table > tbody > tr > td")).toBe(cell);
    expect(cell?.colSpan).toBe(2);
    expect(cell?.rowSpan).toBe(3);
    expect(cell?.classList.contains("cell-paint")).toBe(true);
    expect(cell?.getAttribute("role")).toBe("gridcell");
    expect(card?.getAttribute("role")).toBe("listitem");
    cell?.click();
    expect(activate).toHaveBeenCalledTimes(1);
    tableOwner.value = tableB;
    cellOwner.value = cellB;
    cardOwner.value = cardB;
    await settle();
    expect(tableA).toHaveBeenLastCalledWith(null);
    expect(cellA.mock.calls).toEqual([[cell], [null]]);
    expect(cardA.mock.calls).toEqual([[card], [null]]);
    expect(tableB).toHaveBeenLastCalledWith(table);
    expect(cellB.mock.calls).toEqual([[cell]]);
    expect(cardB.mock.calls).toEqual([[card]]);
    tableOwner.value = undefined;
    cellOwner.value = undefined;
    cardOwner.value = undefined;
    await settle();
    expect(tableB).toHaveBeenLastCalledWith(null);
    expect(cellB.mock.calls).toEqual([[cell], [null]]);
    expect(cardB.mock.calls).toEqual([[card], [null]]);
    expect(root.querySelector("table")).toBe(table);
    expect(root.querySelector("td")).toBe(cell);
    expect(root.querySelector("article")).toBe(card);
  });
});
