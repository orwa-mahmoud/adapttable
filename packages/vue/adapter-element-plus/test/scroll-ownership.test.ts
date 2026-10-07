import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { h, nextTick } from "vue";
import { parse } from "vue/compiler-sfc";

import DataTable from "../src/DataTable.vue";
import { extraRows, pinnedSummaryRows, rowAppearance } from "../src/rows";
import { mount, node } from "./mount";

interface Row {
  id: string;
  name: string;
}
const require = createRequire(import.meta.url);
const ownedStyles = parse(
  readFileSync(require.resolve("../src/DataTable.vue"), "utf8")
).descriptor.styles;
if (
  ownedStyles.some(
    (style) =>
      style.src !== undefined ||
      style.scoped === true ||
      (style.lang !== undefined && style.lang !== "css")
  )
) {
  throw new Error(
    "Scroll ownership tests require the ordinary inline kit stylesheet."
  );
}
const css = [
  readFileSync(require.resolve("element-plus/theme-chalk/el-card.css"), "utf8"),
  ...ownedStyles.map((style) => style.content),
].join("\n");
let styles: HTMLStyleElement;
beforeEach(() => {
  styles = document.createElement("style");
  styles.textContent = css;
  document.head.append(styles);
});
afterEach(() => styles.remove());
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const base = {
  data: rows,
  columns: [{ key: "name" }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
};
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
describe("Element Plus card scroll ownership with actual vendor CSS", () => {
  for (const mobile of [false, true]) {
    it(`leaves the prepared viewport as the only default scroll container, mobile=${mobile}`, async () => {
      const { root } = mount(() =>
        h(DataTable<Row>, {
          ...base,
          forceMobile: mobile,
          features: [
            pinnedSummaryRows<Row>({ bottom: [{ id: "sum", name: "Total" }] }),
            extraRows([
              { key: "note", kind: "fullWidth", render: () => "Note" },
            ]),
          ],
        })
      );
      await tick();
      const viewport = node<HTMLElement>(
        root,
        '[data-adapttable-part="scroll-box"]'
      );
      expect(getComputedStyle(viewport).overflow).toBe("auto");
      const cards = [...viewport.querySelectorAll<HTMLElement>(".el-card")];
      expect(cards).toHaveLength(mobile ? 4 : 1);
      for (const card of cards) {
        expect(getComputedStyle(card).overflow).toBe("visible");
        const body = node<HTMLElement>(card, ".el-card__body");
        expect(getComputedStyle(body).overflow).toBe("visible");
        expect(body.style.padding).not.toBe("");
      }
    });
  }
  it("keeps native body padding consistent for normal and summary cards", async () => {
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: true,
        features: [
          pinnedSummaryRows<Row>({ bottom: [{ id: "sum", name: "Total" }] }),
        ],
      })
    );
    await tick();
    const normal = node<HTMLElement>(root, '[data-row-id="a"]');
    const summary = node<HTMLElement>(
      root,
      '[data-adapttable-part="pinned-summary-bottom"]'
    );
    expect(Number.parseFloat(getComputedStyle(normal).padding)).toBe(0);
    expect(Number.parseFloat(getComputedStyle(summary).padding)).toBe(0);
    expect(node<HTMLElement>(normal, ".el-card__body").style.padding).toBe(
      "1rem"
    );
    expect(node<HTMLElement>(summary, ".el-card__body").style.padding).toBe(
      "1rem"
    );
  });
  it("keeps an explicit host card overflow style authoritative", async () => {
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: true,
        features: [
          rowAppearance<Row>({
            rowStyle: (row) => ({
              overflow: row.id === "a" ? "hidden" : undefined,
            }),
          }),
        ],
      })
    );
    await tick();
    expect(node<HTMLElement>(root, '[data-row-id="a"]').style.overflow).toBe(
      "hidden"
    );
    expect(getComputedStyle(node(root, '[data-row-id="b"]')).overflow).toBe(
      "visible"
    );
  });
});
