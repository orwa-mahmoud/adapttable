import { describe, expect, it } from "vitest";
import { h, nextTick, ref } from "vue";

import DataTable from "../src/DataTable.vue";
import { ElementLoadingState } from "../src/ElementLoadingState";
import { mount, node } from "./mount";

const part = (name: string) => `[data-adapttable-part="${name}"]`;

describe("Element loading placeholders", () => {
  it("renders semantic desktop rows with kit skeletons and host classes", () => {
    const { root } = mount(() =>
      h(ElementLoadingState, {
        rows: 2.9,
        columns: 3,
        mobile: false,
        classNames: {
          loadingTable: "host-table",
          loadingHeaderRow: "host-heading",
          loadingHeaderCell: "host-header-cell",
          loadingRow: "host-row",
          loadingCell: "host-cell",
          loadingLine: "host-line",
        },
      })
    );
    const table = node<HTMLTableElement>(root, part("loading-table"));
    expect(table.tagName).toBe("TABLE");
    expect(table.classList.contains("host-table")).toBe(true);
    expect(table.getAttribute("aria-hidden")).toBe("true");
    expect(table.querySelectorAll("thead .host-heading")).toHaveLength(1);
    expect(table.querySelectorAll("th.host-header-cell")).toHaveLength(3);
    expect(table.querySelectorAll("tbody tr.host-row")).toHaveLength(2);
    expect(table.querySelectorAll("td.host-cell")).toHaveLength(6);
    const lines = [...table.querySelectorAll<HTMLElement>("thead .host-line")];
    expect(
      lines.every((line) => line.classList.contains("el-skeleton__item"))
    ).toBe(true);
    expect(lines.map((line) => line.style.width)).toEqual([
      "70%",
      "55%",
      "42%",
    ]);
    expect(root.querySelector('[role="status"]')).toBeNull();
  });

  it("uses native cards with at most four decorative lines on mobile", () => {
    const { root } = mount(() =>
      h(ElementLoadingState, {
        rows: 2,
        columns: 6,
        mobile: true,
        classNames: { loadingCards: "host-cards", loadingCard: "host-card" },
      })
    );
    expect(node(root, part("loading-cards")).getAttribute("aria-hidden")).toBe(
      "true"
    );
    expect(
      node(root, part("loading-cards")).classList.contains("host-cards")
    ).toBe(true);
    const cards = [...root.querySelectorAll(part("loading-card"))];
    expect(cards).toHaveLength(2);
    for (const card of cards) {
      expect(card.classList.contains("el-card")).toBe(true);
      expect(card.classList.contains("host-card")).toBe(true);
      expect(card.querySelectorAll(part("loading-line"))).toHaveLength(4);
    }
  });

  it.each([-2, Number.NaN, Number.POSITIVE_INFINITY])(
    "renders no body rows for invalid count %s while retaining a minimum column",
    (rows) => {
      const { root } = mount(() =>
        h(ElementLoadingState, {
          rows,
          columns: 0,
          mobile: false,
          classNames: {},
        })
      );
      expect(root.querySelectorAll(part("loading-row"))).toHaveLength(0);
      expect(root.querySelectorAll(part("loading-header-cell"))).toHaveLength(
        1
      );
    }
  );

  it.each([false, true])(
    "hands loading presentation back to real data mobile=%s",
    async (mobile) => {
      const loading = ref(true);
      const { root } = mount(() =>
        h(DataTable<{ id: string }>, {
          data: loading.value ? [] : [{ id: "ready" }],
          columns: [{ key: "id", header: "ID" }],
          rowKey: (row) => row.id,
          urlSync: false,
          isLoading: loading.value,
          forceMobile: mobile,
        })
      );
      await nextTick();
      expect(
        root.querySelector(part(mobile ? "loading-cards" : "loading-table"))
      ).not.toBeNull();
      expect(root.querySelector('[data-row-id="ready"]')).toBeNull();
      loading.value = false;
      await nextTick();
      expect(
        root.querySelector(part(mobile ? "loading-cards" : "loading-table"))
      ).toBeNull();
      expect(root.querySelector('[data-row-id="ready"]')).not.toBeNull();
    }
  );
});
