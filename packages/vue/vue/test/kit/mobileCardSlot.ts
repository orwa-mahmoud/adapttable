import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import type { DataTableSlots } from "@adapttable/vue/adapter";
import type { rowDetail } from "@adapttable/vue/features";
import { expect } from "vitest";
import {
  type App,
  type Component,
  createApp,
  h,
  nextTick,
  shallowRef,
} from "vue";

import { selection } from "../../src/features/headlessFactories";
/** A Vue kit as the shared card-slot suite drives it. */
export interface VueCardSlotKit {
  /** The kit's `DataTable`. */
  readonly DataTable: Component;
  /** The kit's row-detail factory. */
  readonly rowDetail: typeof rowDetail;
  /** Installs what the kit's components need on an app (a plugin). */
  readonly install?: (app: App) => void;
}

interface Row {
  id: string;
  name: string;
  team: string;
}
type CardContext = Parameters<NonNullable<DataTableSlots<Row>["card"]>>[0];

/**
 * The shared custom mobile-card body suite: every Vue kit keeps native
 * selection, expansion and prepared values around a host's card body.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function mobileCardSlotTests(
  kit: VueCardSlotKit
): readonly ConformanceTest[] {
  return collectConformanceTests(({ it }) => {
    it("keeps native selection and prepared values when the custom mobile body changes", async () => {
      const custom = shallowRef(true);
      const root = document.createElement("div");
      document.body.append(root);
      const renders: {
        selected: boolean;
        expanded: boolean;
        labels: readonly string[];
      }[] = [];
      const app = createApp({
        setup() {
          return () =>
            h(
              kit.DataTable,
              {
                data: [{ id: "a", name: "Ada", team: "Core" }],
                columns: [
                  { key: "name", header: "Full name" },
                  { key: "team", mobileLabel: "Team tile" },
                  { key: "id" },
                ],
                rowKey: (row: Row) => row.id,
                forceMobile: true,
                urlSync: false,
                maxHeight: 240,
                features: [
                  selection(),
                  kit.rowDetail<Row>(
                    (row) => h("p", `Details for ${row.name}`),
                    ["a"]
                  ),
                ],
              },
              custom.value
                ? {
                    card: ({ fields, selected, expanded }: CardContext) => {
                      renders.push({
                        selected,
                        expanded,
                        labels: fields.map((field) => field.label),
                      });
                      return h(
                        "section",
                        { "data-custom-body": "" },
                        fields.map((field) =>
                          h("div", [field.label, field.value])
                        )
                      );
                    },
                  }
                : {}
            );
        },
      });
      kit.install?.(app);
      try {
        app.mount(root);
        await nextTick();
        expect(root.querySelector("[data-custom-body]")?.textContent).toContain(
          "Ada"
        );
        expect(renders.at(-1)?.labels).toEqual([
          "Full name",
          "Team tile",
          "Id",
        ]);
        const checkbox = root.querySelector<HTMLElement>(
          '[data-row-id="a"] [role="checkbox"], [data-row-id="a"] input[type="checkbox"]'
        );
        expect(checkbox).not.toBeNull();
        checkbox!.click();
        await nextTick();
        expect(renders.at(-1)?.selected).toBe(true);
        expect(renders.at(-1)?.expanded).toBe(true);
        expect(
          root.querySelector('[data-adapttable-part="card-detail"]')
            ?.textContent
        ).toContain("Details for Ada");
        const toggle = root.querySelector<HTMLButtonElement>(
          '[data-adapttable-part="expand-button"]'
        );
        expect(toggle).not.toBeNull();
        toggle!.click();
        await nextTick();
        expect(renders.at(-1)?.expanded).toBe(false);
        custom.value = false;
        await nextTick();
        expect(root.querySelector("[data-custom-body]")).toBeNull();
        expect(root.querySelector('[data-row-id="a"]')?.textContent).toContain(
          "Ada"
        );
        expect(
          root
            .querySelector('[data-adapttable-part="scroll-box"]')
            ?.getAttribute("tabindex")
        ).toBe("0");
      } finally {
        app.unmount();
        root.remove();
      }
    });

    it("draws a custom mobile body that arrives after the table mounted", async () => {
      const custom = shallowRef(false);
      const root = document.createElement("div");
      document.body.append(root);
      const app = createApp({
        setup() {
          return () =>
            h(
              kit.DataTable,
              {
                data: [{ id: "a", name: "Ada", team: "Core" }],
                columns: [
                  { key: "name", header: "Full name" },
                  { key: "team", header: "Team" },
                ],
                rowKey: (row: Row) => row.id,
                forceMobile: true,
                urlSync: false,
              },
              custom.value
                ? {
                    card: ({ fields }: CardContext) =>
                      h(
                        "section",
                        { "data-custom-body": "" },
                        fields.map((field) => field.label)
                      ),
                  }
                : {}
            );
        },
      });
      kit.install?.(app);
      try {
        app.mount(root);
        await nextTick();
        expect(root.querySelector("[data-custom-body]")).toBeNull();
        expect(root.textContent).toContain("Ada");
        custom.value = true;
        await nextTick();
        expect(root.querySelector("[data-custom-body]")?.textContent).toContain(
          "Full name"
        );
      } finally {
        app.unmount();
        root.remove();
      }
    });
  });
}
