import type { ColumnDef, TableFeature } from "@adapttable/vue";
import { describe, expect, it, vi } from "vitest";
import {
  Comment,
  defineComponent,
  Fragment,
  h,
  nextTick,
  shallowRef,
  Text,
  type VNodeChild,
} from "vue";

import { DataTable } from "../src";
import { nuxtControlSize, provideNuxtDensity } from "../src/densityContext";
import { rowActions } from "../src/row-actions";
import { rowDetail } from "../src/row-detail";
import { rowReorder } from "../src/row-reorder";
import { find, mountNuxt, part, tick } from "./actions.helpers";

interface Row {
  id: string;
  name: string;
  score: number;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada", score: 1 },
  { id: "b", name: "Bea", score: 2 },
];
const emptyActions: readonly [string, () => VNodeChild][] = [
  ["null", () => null],
  ["undefined", () => undefined],
  ["false", () => false],
  ["true", () => true],
  ["whitespace", () => "   "],
  ["empty array", () => []],
  ["comment", () => h(Comment)],
  ["empty text", () => h(Text, null, "   ")],
  [
    "empty fragment",
    () => h(Fragment, null, [h(Comment), h(Text, null, " "), false]),
  ],
];
const presentActions: readonly [string, () => VNodeChild, string][] = [
  ["text", () => "Notes", "Notes"],
  ["zero", () => 0, "0"],
  ["text node", () => h(Text, null, "Text notes"), "Text notes"],
  ["element", () => h("span", "Element notes"), "Element notes"],
  [
    "nested fragment",
    () => h(Fragment, null, [h(Comment), [h("span", "Nested notes")]]),
    "Nested notes",
  ],
];
describe("Nuxt prepared header content", () => {
  it.each(emptyActions)(
    "omits an empty header-action wrapper for %s",
    async (_name, content) => {
      const { host } = mountNuxt(() =>
        h(DataTable<Row>, {
          data,
          columns: [{ key: "name", headerActions: content }],
          rowKey: (row) => row.id,
          searchable: false,
          urlSync: false,
          forceMobile: false,
        })
      );
      await tick();
      expect(host.querySelector(part("header-actions"))).toBeNull();
    }
  );
  it.each(presentActions)(
    "retains meaningful %s without making a second control",
    async (_name, content, expected) => {
      const { host } = mountNuxt(() =>
        h(DataTable<Row>, {
          data,
          columns: [{ key: "name", headerActions: content }],
          rowKey: (row) => row.id,
          searchable: false,
          urlSync: false,
          forceMobile: false,
          classNames: { headerActions: "host-actions" },
        })
      );
      await tick();
      const actions = find(host, part("header-actions"));
      expect(actions.textContent).toBe(expected);
      expect(actions.classList.contains("host-actions")).toBe(true);
      expect(actions.querySelector("button")).toBeNull();
    }
  );
});

describe("Nuxt column-aligned summaries", () => {
  it.each([false, true])(
    "renders reactive summaries with utility columns (mobile=%s)",
    async (mobile) => {
      const total = shallowRef(3);
      const clicked = vi.fn();
      const features: readonly TableFeature<Row>[] = [
        rowDetail<Row>((row) => h("p", row.name)),
        rowReorder<Row>(vi.fn()),
        rowActions<Row>([{ key: "view", label: "View row", onClick: clicked }]),
      ];
      const columns: readonly ColumnDef<Row>[] = [
        { key: "name", header: "Name", mobileLabel: "Person" },
        { key: "score", header: "Score" },
        { key: "missing", footer: () => h("strong", "Custom footer") },
      ];
      const { host } = mountNuxt(() =>
        h(DataTable<Row>, {
          data,
          columns,
          rowKey: (row) => row.id,
          features,
          selectable: true,
          forceMobile: mobile,
          searchable: false,
          urlSync: false,
          summaryRow: () => ({ name: null, score: total.value }),
          classNames: {
            summary: "summary-paint",
            summaryCard: "summary-card-paint",
            summaryCell: "summary-cell-paint",
          },
        })
      );
      await tick();
      if (mobile) {
        const summary = find(host, part("summary-card"));
        expect(summary.classList.contains("summary-card-paint")).toBe(true);
        expect(summary.querySelectorAll(part("card-row"))).toHaveLength(2);
        expect(summary.textContent).toContain("Score3");
        expect(summary.textContent).toContain("Custom footer");
        expect(host.querySelectorAll(part("card-actions"))).toHaveLength(2);
      } else {
        const summary = find(host, part("summary"));
        expect(summary.tagName).toBe("TFOOT");
        expect(summary.classList.contains("summary-paint")).toBe(true);
        const cells = summary.querySelectorAll(part("summary-cell"));
        expect(cells).toHaveLength(7);
        expect(
          [...cells].every((cell) =>
            cell.classList.contains("summary-cell-paint")
          )
        ).toBe(true);
        expect(summary.textContent).toBe("3Custom footer");
      }
      total.value = 6;
      await tick();
      expect(
        find(host, part(mobile ? "summary-card" : "summary")).textContent
      ).toContain("6");
      expect(clicked).not.toHaveBeenCalled();
    }
  );
  it("keeps simple desktop summary cells and renders host footer slots on null-valued mobile fields", async () => {
    const mobile = shallowRef(false);
    const { host } = mountNuxt(() =>
      h(
        DataTable<Row>,
        {
          data,
          columns: [{ key: "name" }, { key: "score" }],
          rowKey: (row) => row.id,
          forceMobile: mobile.value,
          searchable: false,
          urlSync: false,
          summaryRow: () => ({}),
        },
        { footer: () => h("span", "Host footer") }
      )
    );
    await tick();
    expect(
      host.querySelectorAll(`${part("summary")} ${part("summary-cell")}`)
    ).toHaveLength(2);
    mobile.value = true;
    await tick();
    const summary = find(host, part("summary-card"));
    expect(summary.querySelectorAll(part("card-row"))).toHaveLength(2);
    expect(summary.textContent).toContain("Host footer");
  });
});

it("reads standalone and inherited render-function density without creating state", async () => {
  expect(nuxtControlSize()).toBe("md");
  const density = shallowRef<"comfortable" | "compact">("comfortable");
  const Child = defineComponent(() => () => h("output", nuxtControlSize()));
  const Parent = defineComponent(() => {
    provideNuxtDensity(() => density.value);
    return () => h(Child);
  });
  const plain = mountNuxt(() => h(Child));
  expect(plain.host.textContent).toBe("md");
  const nested = mountNuxt(() => h(Parent));
  expect(nested.host.textContent).toBe("md");
  density.value = "compact";
  await nextTick();
  expect(nested.host.textContent).toBe("sm");
});
