import { createMemoryAdapter } from "@adapttable/core";
import { expect, it, vi } from "vitest";
import { createSSRApp, effectScope, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import type { ColumnDef } from "../src/columnDef";
import { grouping } from "../src/features/grouping";
import { cellSpan, pinnedSummaryRows } from "../src/features/headlessFactories";
import { nestedTable, rowDetail } from "../src/features/rowDetail";
import { rowPinning } from "../src/features/rowPinning";
import type { ComposedFeature } from "../src/features/tableFeature";
import { tree } from "../src/features/tree";
import { useGroupCollapse } from "../src/grouping/groupCollapse";
import { useGroupPaging } from "../src/grouping/groupPaging";
import {
  GroupRowChrome,
  type GroupRowChromeProps,
} from "../src/grouping/groupRowChrome";
import {
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import { useLazyChildren } from "../src/tree/lazyChildren";
import { nestedTableDetail } from "../src/tree/nestedTable";
import { useGroupCollapseUrlState } from "../src/url/useGroupCollapseUrlState";
import { useDataTableShell } from "../src/useDataTableShell";
interface Row {
  id: string;
  team: string;
  score: number;
  parent?: string;
}
const data = [
  { id: "a", team: "A", score: 1 },
  { id: "b", team: "A", score: 2 },
  { id: "c", team: "B", score: 3 },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "team", header: "Team" },
  {
    key: "score",
    header: "Score",
    formatAggregate: (value) =>
      `Total ${typeof value === "number" ? value : ""}`,
  },
];
const base = { data, columns, rowKey: (row: Row) => row.id, urlSync: false };
function slots(): TableChromeSlots<Row> {
  return {
    SortButton: ({ attrs }) => h("button", attrs),
    SelectionCheckbox: ({ attrs }) => h("input", attrs),
    RowDetailToggle: ({ attrs }) => h("button", attrs),
    TreeToggle: ({ attrs }) => h("button", attrs),
    GroupRow: (props) =>
      GroupRowChrome({
        ...props,
        slots: {
          Button: ({ attrs, content, expanded }) =>
            h("button", attrs, [content ?? (expanded ? "−" : "+")]),
          Checkbox: ({ attrs }) => h("input", attrs),
        },
      }),
  };
}
async function render(
  node: () => ReturnType<typeof h> | ReturnType<typeof DesktopTableChrome<Row>>
) {
  return renderToString(createSSRApp({ render: node }));
}
it("serializes collapsed groups using the shared codec and replaces namespaces", () => {
  const scope = effectScope();
  const adapter = createMemoryAdapter("?unrelated=yes");
  const key = shallowRef("one");
  const enabled = shallowRef(true);
  const url = scope.run(() =>
    useGroupCollapseUrlState(
      {
        urlAdapter: adapter,
        urlKey: key,
        defaultCollapsedGroupIds: ["default"],
      },
      enabled
    )
  )!;
  expect(url.collapsedGroupIds.value).toEqual(["default"]);
  url.onCollapsedGroupIdsChange(["a,b", "group:é"]);
  expect(adapter.getSearch()).toContain("one.groupClosed");
  expect(adapter.getSearch()).toContain("unrelated=yes");
  key.value = "two";
  expect(url.collapsedGroupIds.value).toEqual(["default"]);
  url.onCollapsedGroupIdsChange([]);
  expect(adapter.getSearch()).toContain("two.groupClosed=");
  key.value = "one";
  expect(url.collapsedGroupIds.value).toEqual(["a,b", "group:é"]);
  enabled.value = false;
  url.onCollapsedGroupIdsChange(["paused"]);
  expect(url.collapsedGroupIds.value).not.toContain("paused");
  scope.stop();
});
it("initializes SSR collapsed groups from a request-owned adapter", async () => {
  const adapter = createMemoryAdapter("?groupClosed=a");
  const html = await renderToString(
    createSSRApp({
      setup() {
        const state = useGroupCollapseUrlState({ urlAdapter: adapter });
        return () => h("div", state.collapsedGroupIds.value.join(","));
      },
    })
  );
  expect(html).toContain(">a<");
});
it("uses ref group keys, page widening, host callbacks and paging actions", () => {
  const scope = effectScope();
  const key = shallowRef("team");
  const changed = vi.fn();
  const load = vi.fn();
  const shell = scope.run(() =>
    useDataTableShell({
      ...base,
      defaults: { limit: 1 },
      features: [
        grouping<Row>(key, {
          onGroupByChange: changed,
          onGroupLoadMore: load,
          groupPageSize: 1,
          groupRowPageSize: 1,
        }),
      ],
    })
  )!;
  expect(shell.source.value.rows).toHaveLength(1);
  expect(shell.table.rows.value).toHaveLength(3);
  expect(shell.runtime.view()?.rows).toHaveLength(3);
  shell.grouping.value!.setGroupBy("score");
  expect(changed).toHaveBeenCalledWith(["score"]);
  shell.grouping.value!.showMore({ scope: "groups" });
  shell.grouping.value!.showMore({
    scope: "rows",
    groupKey: required(shell.grouping.value!.entries[0]).key,
  });
  expect(load).toHaveBeenCalled();
  key.value = "score";
  expect(shell.grouping.value!.groupBy).toEqual(["score"]);
  shell.grouping.value!.collapseAll();
  expect(
    shell.grouping.value!.entries.every(
      (entry) => entry.kind === "group" || entry.kind === "groupMore"
    )
  ).toBe(true);
  key.value = "";
  expect(shell.grouping.value).toBeUndefined();
  scope.stop();
});
it("supports direct collapseAll/reset actions and pauses paging", () => {
  const scope = effectScope();
  const enabled = shallowRef(true);
  const state = scope.run(() => ({
    collapse: useGroupCollapse(),
    paging: useGroupPaging(enabled),
  }))!;
  state.collapse.value.collapseAll(["a", "b"]);
  expect([...state.collapse.value.collapsedGroupIds]).toEqual(["a", "b"]);
  state.paging.value.showMore(2);
  expect(state.paging.value.paging.groups).toBe(2);
  state.paging.value.reset();
  expect(state.paging.value.paging).toEqual({});
  enabled.value = false;
  state.paging.value.showMore(3);
  state.paging.value.reset();
  expect(state.paging.value.paging).toEqual({});
  scope.stop();
});
it("keeps grouped aggregates aligned with leading selection and trailing actions columns", async () => {
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      ...base,
      selectable: true,
      features: [
        grouping<Row>("team", {
          groupAggregates: (rows) => ({ score: rows.length }),
        }),
      ],
    })
  )!;
  const group = shell.desktop.value.bodySlots!.find(
    (slot) => slot.kind === "group"
  )!;
  if (group.kind !== "group") throw new Error("missing group");
  const model = { ...group.model!, trailingColumns: 1 };
  let checkbox: GroupRowChromeProps<Row>["slots"]["Checkbox"] extends (
    value: infer P
  ) => unknown
    ? P
    : never;
  const html = await render(() =>
    GroupRowChrome({
      slot: { ...group, model },
      columnCount: 4,
      mobile: false,
      slots: {
        Button: (props) => h("button", props.attrs),
        Checkbox: (props) => {
          checkbox = props;
          return h("input", props.attrs);
        },
      },
    })
  );
  expect(html).toContain('colspan="2"');
  expect(html).toContain('colspan="1"');
  expect(html).toContain("Total 2");
  (checkbox!.attrs.onChange as () => void)();
  expect([...shell.selection.value!.selectedIds.value]).toEqual(["a", "b"]);
  scope.stop();
});
it("renders mobile groups, footer aggregates, empty slots and required controls", async () => {
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      ...base,
      selectable: true,
      features: [
        grouping<Row>("team", {
          groupFooters: true,
          groupPageSize: 1,
          groupAggregates: () => ({ team: 5n, score: 7 }),
        }),
      ],
    })
  )!;
  const html = await render(() =>
    MobileCardsChrome({ model: shell.mobile.value, slots: slots() })
  );
  expect(html).toContain('data-adapttable-part="group-card"');
  expect(html).toContain('data-adapttable-part="group-footer-card"');
  expect(html).toContain('data-adapttable-part="group-more-card"');
  expect(html).toContain("Total 7");
  const group = shell.desktop.value.bodySlots!.find(
    (slot) => slot.kind === "group"
  )!;
  if (group.kind !== "group") throw new Error("missing group");
  expect(() =>
    GroupRowChrome({
      slot: { ...group, model: undefined },
      columnCount: 3,
      mobile: false,
      slots: { Button: () => null, Checkbox: () => null },
    })
  ).toThrow("group-row model");
  const missingButton = {} as GroupRowChromeProps<Row>["slots"];
  expect(() =>
    GroupRowChrome({
      slot: group,
      columnCount: 3,
      mobile: false,
      slots: missingButton,
    })
  ).toThrow("GroupRow.Button");
  expect(() =>
    GroupRowChrome({
      slot: group,
      columnCount: 3,
      mobile: false,
      slots: {
        Button: () => null,
      } as unknown as GroupRowChromeProps<Row>["slots"],
    })
  ).toThrow("GroupRow.Checkbox");
  scope.stop();
});
it("clips cell spans at group and open detail boundaries", () => {
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      ...base,
      features: [
        grouping<Row>("team"),
        rowDetail<Row>((row) => row.id, ["a"]),
        cellSpan<Row>(() => ({ rowSpan: 20 })),
      ],
    })
  )!;
  const rowSlots = shell.desktop.value.bodySlots!.filter(
    (slot) => slot.kind === "row"
  );
  expect(
    rowSlots.map((slot) => required(slot.wiring.cells[0])?.attrs.rowspan)
  ).toEqual([1, 1, 1]);
  scope.stop();
});
it("renders summary selection placeholders and blocks data pins with hierarchy", async () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      ...base,
      selectable: true,
      features: [
        tree<Row>({ getParentId: (row) => row.parent }),
        rowPinning({ pinnedRowIds: { top: ["b"], bottom: [] } }),
        pinnedSummaryRows<Row>({ top: [required(data[0])] }),
      ],
    })
  )!;
  const first = required(shell.desktop.value.bodySlots![0]);
  expect(first).toMatchObject({
    kind: "row",
    wiring: { summary: true, checkboxAttrs: undefined },
  });
  const html = await render(() =>
    DesktopTableChrome({ model: shell.desktop.value, slots: slots() })
  );
  const el = document.createElement("div");
  el.innerHTML = html;
  expect(
    el.querySelector('[data-adapttable-part="pinned-summary-top"]')?.children
      .length
  ).toBe(3);
  expect(el.querySelector('[data-adapttable-part="pinned-top"]')).toBeNull();
  expect(warning).toHaveBeenCalled();
  scope.stop();
});
it("safely replaces lazy loaders and ignores settlement after disposal", async () => {
  const scope = effectScope();
  const callback = shallowRef<(row: Row) => Promise<void> | void>(
    () => undefined
  );
  const enabled = shallowRef(true);
  const state = scope.run(() =>
    useLazyChildren<Row>(() => ({
      onLoadChildren: callback.value,
      hasLoadedChildren: () => false,
      getRowId: (row) => row.id,
      enabled,
    }))
  )!;
  state.value.loadIfNeeded(required(data[0]));
  await Promise.resolve();
  expect(state.value.loadingIds.size).toBe(0);
  const failed = vi.fn();
  callback.value = failed;
  state.value.loadIfNeeded(required(data[1]));
  expect(failed).toHaveBeenCalledWith(required(data[1]));
  enabled.value = false;
  state.value.loadIfNeeded(required(data[2]));
  expect(failed).toHaveBeenCalledTimes(1);
  scope.stop();
});
it("removes empty tree/detail models and supports nested fallback content", async () => {
  const features = shallowRef<readonly ComposedFeature<Row>[]>([tree<Row>()]);
  const scope = effectScope();
  const shell = scope.run(() => useDataTableShell({ ...base, features }))!;
  expect(shell.tree.value).toBeUndefined();
  features.value = [
    rowDetail<Row>((row) => row.id, [], { expandedRowIds: ["b"] }),
  ];
  expect(shell.detail.value!.expansion.isExpanded("b")).toBe(true);
  features.value = [];
  expect(shell.detail.value).toBeUndefined();
  expect(nestedTableDetail<Row>({})).toBeUndefined();
  expect(
    await render(() =>
      nestedTableDetail<Row>({
        nestedTable: () => undefined,
        renderRowDetail: (row) => row.id,
      })!(required(data[0]))
    )
  ).toContain("a");
  scope.stop();
});
it("forwards group classes and native Vue aggregate renderers", async () => {
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      ...base,
      columns: [
        { key: "team" },
        { key: "score", formatAggregate: () => h("strong", "Rich total") },
      ],
      features: [
        grouping<Row>("team", { groupAggregates: () => ({ score: 1 }) }),
      ],
    })
  )!;
  const html = await render(() =>
    DesktopTableChrome({
      model: shell.desktop.value,
      slots: slots(),
      classNames: {
        groupRow: "group-style",
        groupLabel: "label-style",
        groupAggregate: "aggregate-style",
      },
    })
  );
  expect(html).toContain('class="group-style"');
  expect(html).toContain('class="label-style"');
  expect(html).toContain("<strong>Rich total</strong>");
  scope.stop();
});
it("ignores unrelated tree keys and uses treegrid cell semantics", () => {
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      ...base,
      data: [required(data[0]), { ...required(data[1]), parent: "a" }],
      features: [tree<Row>({ getParentId: (row) => row.parent })],
    })
  )!;
  const row = shell.desktop.value.bodySlots!.find(
    (slot) => slot.kind === "row"
  )!;
  if (row.kind !== "row") throw new Error("missing row");
  const handler = required(row.wiring.cells[0]).tree!.toggleAttrs!
    .onKeydown as (event: KeyboardEvent) => void;
  handler(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(shell.tree.value!.entries).toHaveLength(1);
  handler(new KeyboardEvent("keydown", { key: "ArrowRight" }));
  expect(shell.tree.value!.entries).toHaveLength(2);
  expect(required(row.wiring.cells[0]).attrs.role).toBe("gridcell");
  const open = shell.desktop.value.bodySlots!.find(
    (slot) => slot.kind === "row"
  )!;
  if (open.kind !== "row") throw new Error("missing row");
  (
    required(open.wiring.cells[0]).tree!.toggleAttrs!.onKeydown as (
      event: KeyboardEvent
    ) => void
  )(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
  expect(shell.tree.value!.entries).toHaveLength(1);
  scope.stop();
});
it("keeps a composed detail renderer alive when the nested-table feature is removed", () => {
  const plain = rowDetail<Row>((row) => row.id, ["a"]);
  const nested = nestedTable<Row>(() => ({ table: () => h("div", "Nested") }));
  const features = shallowRef<readonly ComposedFeature<Row>[]>([plain, nested]);
  const scope = effectScope();
  const shell = scope.run(() => useDataTableShell({ ...base, features }))!;
  expect(shell.detail.value).toBeDefined();
  features.value = [plain];
  expect(shell.detail.value).toBeDefined();
  expect(shell.detail.value!.render(required(data[0]))).toBe("a");
  scope.stop();
});

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected fixture value");
  return value;
}
