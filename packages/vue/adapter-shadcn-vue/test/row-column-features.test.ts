import type { ColumnLayoutState } from "@adapttable/vue";
import { afterEach, expect, it, vi } from "vitest";
import { h } from "vue";

import { cellSpan } from "../src/cell-span";
import { collapsibleColumnGroups } from "../src/column-groups";
import { rowEditing } from "../src/editing";
import { extraRows } from "../src/extra-rows";
import { pinnedSummaryRows } from "../src/pinned-summary-rows";
import { resizableColumns } from "../src/resizable-columns";
import { rowActions } from "../src/row-actions";
import { rowAppearance } from "../src/row-appearance";
import { virtualize } from "../src/virtualize";
import {
  find,
  key,
  mountFeatures,
  original,
  part,
  type Row,
  tick,
} from "./feature-helpers";

const data = [
  original,
  { ...original, id: "b", name: "Bea" },
  { ...original, id: "c", name: "Cy" },
];
afterEach(() => vi.unstubAllGlobals());

it.each([false, true])(
  "renders independent summaries and extra rows using real desktop/card paths, mobile=%s",
  async (forceMobile) => {
    const view = mountFeatures(
      [
        pinnedSummaryRows<Row>({
          top: [{ ...original, id: "total", name: "TOTAL" }],
        }),
        extraRows([
          {
            key: "note",
            kind: "fullWidth",
            beforeRowId: "b",
            render: () => h("strong", "Important note"),
          },
          { key: "rule", kind: "separator" },
        ]),
        rowAppearance<Row>({
          rowClassName: (row) => `row-${row.id}`,
          rowStyle: (row) => ({ opacity: row.id === "a" ? 0.5 : 1 }),
          rowHeight: (_row, index) => 30 + index,
        }),
      ],
      {
        data,
        forceMobile,
        selectable: true,
        summaryRow: () => ({ name: "Total values" }),
      }
    );
    await tick();
    expect(view.root.textContent).toContain("TOTAL");
    expect(view.root.textContent).toContain("Important note");
    expect(view.root.textContent).toContain("Total values");
    const first = find<HTMLElement>(view.root, '[data-row-id="a"]');
    expect(first.classList.contains("row-a")).toBe(true);
    expect(first.style.opacity).toBe("0.5");
    expect(
      view.root.querySelectorAll(
        forceMobile ? 'article [role="checkbox"]' : 'tbody [role="checkbox"]'
      )
    ).toHaveLength(3);
    if (!forceMobile)
      expect(
        find(view.root, part("pinned-summary-top")).querySelector(
          '[role="checkbox"]'
        )
      ).toBeNull();
  }
);

it("preserves mobile action and row-edit controls while callbacks remain host-owned", async () => {
  const inspect = vi.fn();
  const save = vi.fn();
  const view = mountFeatures(
    [
      rowActions<Row>([{ key: "inspect", label: "Inspect", onClick: inspect }]),
      rowEditing<Row>(save),
    ],
    { data, forceMobile: true }
  );
  await tick();
  const card = find<HTMLElement>(view.root, 'article[data-row-id="a"]');
  const action = [...card.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent === "Inspect"
  );
  if (!action) throw new Error("Missing mobile action");
  expect(action.dataset.slot).toBe("button");
  action.click();
  expect(inspect).toHaveBeenCalledWith(original);
  expect(card.querySelector(part("row-edit-actions"))).not.toBeNull();
  expect(save).not.toHaveBeenCalled();
});

it("keeps mobile values complete when desktop cells span across extra rows", async () => {
  const view = mountFeatures(
    [
      cellSpan<Row>(({ row, column }) =>
        row.id === "a" && column.key === "name" ? { rowSpan: 2 } : undefined
      ),
      extraRows([
        {
          key: "note",
          kind: "fullWidth",
          beforeRowId: "b",
          render: () => h("span", "Note"),
        },
      ]),
    ],
    { data }
  );
  await tick();
  expect(
    find<HTMLTableCellElement>(view.root, '[data-row-id="a"] td').rowSpan
  ).toBe(3);
  view.props.value = { ...view.props.value, forceMobile: true };
  await tick();
  expect(find(view.root, '[data-row-id="b"]').textContent).toContain("Bea");
  expect(view.root.querySelector("[rowspan]")).toBeNull();
});

it.each(["ltr", "rtl"] as const)(
  "uses shadcn resize and column-group buttons with logical %s keys",
  async (dir) => {
    const change = vi.fn<(value: ColumnLayoutState) => void>();
    const view = mountFeatures(
      [resizableColumns(), collapsibleColumnGroups()],
      {
        dir,
        data,
        columns: [
          {
            header: "Profile",
            collapsedKey: "name",
            children: [{ key: "name" }, { key: "amount" }],
          },
        ],
      },
      { "onUpdate:columnLayout": change }
    );
    await tick();
    const handle = find<HTMLElement>(view.root, part("resize-handle"));
    expect(handle.dataset.slot).toBe("button");
    key(handle, dir === "rtl" ? "ArrowLeft" : "ArrowRight");
    await tick();
    expect(change).toHaveBeenCalled();
    const toggle = find<HTMLButtonElement>(
      view.root,
      part("column-group-toggle")
    );
    expect(toggle.dataset.slot).toBe("button");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    toggle.click();
    await tick();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    toggle.click();
    await tick();
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  }
);

it.each([false, true])(
  "uses semantic virtual padding with complete class hooks, mobile=%s",
  async (forceMobile) => {
    class Observer {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal("ResizeObserver", Observer);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.adapttablePart === "scroll-box" ? 240 : 56;
      }
    );
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(640);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(640);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        return new DOMRect(
          0,
          0,
          640,
          this.dataset.adapttablePart === "scroll-box" ? 240 : 56
        );
      }
    );
    const rows = Array.from({ length: 120 }, (_, index) => ({
      ...original,
      id: `row-${index}`,
    }));
    const view = mountFeatures(
      [
        virtualize({
          maxHeight: 240,
          estimateRowSize: 56,
          estimateCardSize: 56,
          virtualOverscan: 2,
        }),
      ],
      {
        data: rows,
        forceMobile,
        defaults: { limit: 120 },
        paginationMode: "infinite",
        classNames: { virtualSpacer: "consumer-padding" },
      }
    );
    await tick();
    const spacers = view.root.querySelectorAll<HTMLElement>(
      part("virtual-spacer")
    );
    expect(spacers).toHaveLength(2);
    for (const spacer of spacers) {
      expect(spacer.classList.contains("consumer-padding")).toBe(true);
      expect(spacer.tagName).toBe(forceMobile ? "DIV" : "TR");
      expect(spacer.getAttribute("aria-hidden")).toBe("true");
    }
    const visible = view.root.querySelectorAll(
      forceMobile ? "article[data-row-id]" : "tbody [data-row-id]"
    );
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(rows.length);
  }
);
