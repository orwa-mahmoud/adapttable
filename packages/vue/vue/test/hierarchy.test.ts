import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  KeepAlive,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import type { ColumnDef } from "../src/columnDef";
import { grouping } from "../src/features/grouping";
import {
  extraRows,
  pinnedSummaryRows,
} from "../src/features/headlessFactories";
import { nestedTable, rowDetail } from "../src/features/rowDetail";
import type { ComposedFeature } from "../src/features/tableFeature";
import { tree } from "../src/features/tree";
import { useGroupCollapse } from "../src/grouping/groupCollapse";
import { GroupRowChrome } from "../src/grouping/groupRowChrome";
import {
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import { useRowExpansion } from "../src/rows/rowExpansion";
import { useTreeExpansion } from "../src/tree/treeExpansion";
import { useDataTableShell } from "../src/useDataTableShell";
interface Row {
  id: string;
  name: string;
  team: string;
  score: number;
  children?: readonly Row[];
  parent?: string;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", team: "Core", score: 10 },
  { id: "b", name: "Bea", team: "Core", score: 20 },
  { id: "c", name: "Cal", team: "Design", score: 30 },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", header: "Name" },
  { key: "team", header: "Team" },
  { key: "score", header: "Score" },
];
const options = {
  data: rows,
  columns,
  rowKey: (row: Row) => row.id,
  urlSync: false,
};
function controls(): TableChromeSlots<Row> {
  return {
    SortButton: ({ attrs, content }) => h("button", attrs, [content]),
    SelectionCheckbox: ({ attrs }) => h("input", attrs),
    TreeToggle: ({ attrs, expanded }) =>
      h("button", attrs, expanded ? "−" : "+"),
    RowDetailToggle: ({ attrs, expanded }) =>
      h("button", attrs, expanded ? "−" : "+"),
    GroupRow: (props) =>
      GroupRowChrome({
        ...props,
        slots: {
          Button: ({ attrs, content }) => h("button", attrs, [content]),
          Checkbox: ({ attrs }) => h("input", attrs),
        },
      }),
  };
}
function withShell(features: readonly ComposedFeature<Row>[]) {
  const scope = effectScope();
  const shell = scope.run(() => useDataTableShell({ ...options, features }))!;
  return { scope, shell };
}
function mountTable(features: readonly ComposedFeature<Row>[], mobile = false) {
  const el = document.createElement("div");
  document.body.append(el);
  const app = createApp(
    defineComponent({
      setup() {
        const shell = useDataTableShell({ ...options, features });
        return () =>
          mobile
            ? MobileCardsChrome({
                model: shell.mobile.value,
                slots: controls(),
              })
            : DesktopTableChrome({
                model: shell.desktop.value,
                slots: controls(),
              });
      },
    })
  );
  app.mount(el);
  return {
    el,
    stop: () => {
      app.unmount();
      el.remove();
    },
  };
}
describe("hierarchy controlled state", () => {
  it("uses neutral independent id stores and observes controlled/uncontrolled changes", () => {
    const scope = effectScope();
    const input = shallowRef<readonly string[] | undefined>([]);
    const callback = vi.fn();
    const states = scope.run(() => ({
      group: useGroupCollapse({
        collapsedGroupIds: input,
        onCollapsedGroupIdsChange: callback,
      }),
      tree: useTreeExpansion({ defaultExpandedIds: ["root"] }),
      detail: useRowExpansion({ defaultExpandedRowIds: ["a"] }),
    }))!;
    states.group.value.toggle("team");
    expect(callback).toHaveBeenCalledWith(["team"]);
    expect(states.group.value.collapsedGroupIds.size).toBe(0);
    input.value = ["team"];
    expect(states.group.value.isCollapsed("team")).toBe(true);
    input.value = undefined;
    states.group.value.toggle("other");
    expect(states.group.value.isCollapsed("other")).toBe(true);
    states.tree.value.expand("root");
    states.tree.value.expandAll(["x", "y"]);
    expect([...states.tree.value.expandedIds]).toEqual(["x", "y"]);
    states.tree.value.collapseAll();
    states.detail.value.toggle("a");
    expect(states.detail.value.isExpanded("a")).toBe(false);
    const old = states.group.value;
    scope.stop();
    old.toggle("late");
    expect(callback).not.toHaveBeenLastCalledWith(
      expect.arrayContaining(["late"])
    );
  });
  it("requires an owning effect scope", () =>
    expect(() => useTreeExpansion()).toThrow("effectScope"));
});
describe("grouping pipeline", () => {
  it("widens the local page and keeps group and leaf identity stable", () => {
    const { scope, shell } = withShell([
      grouping<Row>("team", {
        groupFooters: true,
        groupRowPageSize: 1,
        groupAggregates: (records) => ({
          score: records.reduce((sum, row) => sum + row.score, 0),
        }),
      }),
    ]);
    const model = shell.grouping.value!;
    expect(model.groupBy).toEqual(["team"]);
    expect(
      shell.desktop.value.bodySlots?.filter((slot) => slot.kind === "group")
        .length
    ).toBe(5);
    const core = model.entries.find(
      (entry) => entry.kind === "group" && entry.label === "Core"
    )!;
    model.showMore({ scope: "rows", groupKey: core.key });
    expect(
      shell.desktop.value.bodySlots
        ?.filter((slot) => slot.kind === "row")
        .map((slot) => slot.key)
    ).toEqual(["a", "b", "c"]);
    shell.grouping.value!.collapsed.toggle(core.key);
    expect(
      shell.desktop.value.bodySlots
        ?.filter((slot) => slot.kind === "row")
        .map((slot) => slot.key)
    ).toEqual(["c"]);
    shell.grouping.value!.expandAll();
    shell.grouping.value!.collapseToDepth(0);
    expect(
      shell.desktop.value.bodySlots?.filter((slot) => slot.kind === "row")
    ).toHaveLength(0);
    scope.stop();
  });
  it("follows reactive keys and feature replacement/removal without stale actions", () => {
    const features = shallowRef<readonly ComposedFeature<Row>[]>([
      grouping<Row>("team"),
    ]);
    const scope = effectScope();
    const shell = scope.run(() => useDataTableShell({ ...options, features }))!;
    const old = shell.grouping.value!;
    const id = required(old.entries[0]).key;
    old.collapsed.toggle(id);
    features.value = [grouping<Row>("team", { groupFooters: true })];
    expect(shell.grouping.value!.collapsed.isCollapsed(id)).toBe(true);
    features.value = [];
    expect(shell.grouping.value).toBeUndefined();
    expect(shell.desktop.value.bodySlots).toBeUndefined();
    const before = shell.source.value.groupBy;
    old.setGroupBy("score");
    expect(shell.source.value.groupBy).toBe(before);
    features.value = [grouping<Row>("team")];
    expect(shell.grouping.value!.collapsed.isCollapsed(id)).toBe(false);
    scope.stop();
  });
  it("uses neutral capability boundaries for unsupported remote grouping", () => {
    const warning = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const { scope: originalScope, shell: original } = withShell([]);
    const raw = {
      ...original.source.value,
      allFilteredRows: undefined,
      capabilities: {
        ...original.source.value.capabilities!,
        grouping: false as const,
      },
    };
    const scope = effectScope();
    const shell = scope.run(() =>
      useDataTableShell({
        ...options,
        source: raw,
        features: [grouping<Row>("team")],
      })
    )!;
    expect(shell.grouping.value).toBeUndefined();
    expect(
      shell.desktop.value.bodySlots?.filter((slot) => slot.kind === "group")
    ).toEqual([]);
    expect(warning).toHaveBeenCalled();
    scope.stop();
    originalScope.stop();
  });
  it("combines summaries and extras exactly once in desktop and mobile", () => {
    const { scope, shell } = withShell([
      grouping<Row>("team"),
      extraRows([
        {
          key: "before-b",
          kind: "fullWidth",
          beforeRowId: "b",
          render: () => h("strong", "Note"),
        },
        { key: "end", kind: "separator" },
      ]),
      pinnedSummaryRows<Row>({
        top: [required(rows[2])],
        bottom: [required(rows[0])],
      }),
    ]);
    const ids = shell.desktop.value.bodySlots!.map((slot) => slot.key);
    expect(ids.filter((id) => id === "before-b")).toHaveLength(1);
    expect(ids.filter((id) => id === "end")).toHaveLength(1);
    expect(required(shell.desktop.value.bodySlots![0])).toMatchObject({
      kind: "row",
      wiring: { summary: true },
    });
    expect(shell.mobile.value.bodySlots!.map((slot) => slot.key)).toEqual(ids);
    scope.stop();
  });
  it("renders kit controls, aligned aggregates, localized count and paged rows", async () => {
    const { el, stop } = mountTable([
      grouping<Row>("team", {
        groupFooters: true,
        groupRowPageSize: 1,
        groupAggregates: (data) => ({
          score: data.reduce((sum, row) => sum + row.score, 0),
        }),
      }),
    ]);
    await nextTick();
    expect(
      el.querySelector('[data-adapttable-part="group-count"]')?.textContent
    ).toContain("2");
    expect(
      el.querySelector('[data-adapttable-part="group-more"]')
    ).not.toBeNull();
    el.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="group-more"]'
    )!.click();
    await nextTick();
    expect(el.querySelector('[data-row-id="b"]')).not.toBeNull();
    el.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="group-toggle"]'
    )!.click();
    await nextTick();
    expect(el.querySelector('[data-row-id="a"]')).toBeNull();
    stop();
  });
});
describe("tree and detail", () => {
  it("walks nested rows, supports source changes and keeps export descendants", () => {
    const data = shallowRef<readonly Row[]>([
      { ...required(rows[0]), children: [required(rows[1])] },
    ]);
    const expanded = shallowRef<readonly string[]>([]);
    const change = vi.fn();
    const scope = effectScope();
    const shell = scope.run(() =>
      useDataTableShell({
        ...options,
        data,
        features: [
          tree<Row>({
            getChildren: (row) => row.children,
            expandedIds: expanded,
            onExpandedIdsChange: change,
          }),
        ],
      })
    )!;
    expect(shell.tree.value!.allEntries.map((entry) => entry.key)).toEqual([
      "a",
      "b",
    ]);
    shell.tree.value!.expansion.toggle("a");
    expect(change).toHaveBeenCalledWith(["a"]);
    expect(shell.tree.value!.entries).toHaveLength(1);
    expanded.value = ["a"];
    expect(
      shell.desktop.value
        .bodySlots!.filter((slot) => slot.kind === "row")
        .map((slot) => slot.key)
    ).toEqual(["a", "b"]);
    const child = shell.desktop.value.bodySlots!.find(
      (slot) => slot.key === "b"
    );
    expect(child).toMatchObject({
      kind: "row",
      wiring: {
        attrs: { "aria-level": 2 },
        cells: expect.arrayContaining([
          expect.objectContaining({
            tree: expect.objectContaining({
              attrs: expect.objectContaining({
                style: expect.objectContaining({
                  paddingInlineStart: "1.5rem",
                }),
              }),
            }),
          }),
        ]),
      },
    });
    expect(
      shell.mobile.value.bodySlots!.find((slot) => slot.key === "b")
    ).toMatchObject({
      kind: "row",
      wiring: { attrs: { style: { marginInlineStart: "1.25rem" } } },
    });
    data.value = [required(rows[2])];
    expect(shell.tree.value!.entries.map((entry) => entry.key)).toEqual(["c"]);
    scope.stop();
  });
  it("uses parent ids and logical arrow keys with RTL", () => {
    const scope = effectScope();
    const shell = scope.run(() =>
      useDataTableShell({
        ...options,
        dir: "rtl",
        data: [required(rows[0]), { ...required(rows[1]), parent: "a" }],
        features: [tree<Row>({ getParentId: (row) => row.parent })],
      })
    )!;
    const row = required(shell.desktop.value.bodySlots![0]);
    if (row.kind !== "row") throw new Error("expected row");
    const attrs = required(row.wiring.cells[0]).tree!.toggleAttrs!;
    const key = attrs.onKeydown as (event: KeyboardEvent) => void;
    key(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    expect(shell.tree.value!.expansion.isExpanded("a")).toBe(true);
    scope.stop();
  });
  it("closes sync and async failed lazy nodes and makes retry one gesture", async () => {
    const load = vi.fn(() => {
      throw new Error("failed");
    });
    const { scope, shell } = withShell([
      tree<Row>({
        getChildren: (row) => row.children,
        hasChildren: () => true,
        onLoadChildren: load,
      }),
    ]);
    shell.tree.value!.expansion.toggle("a");
    await nextTick();
    expect(shell.tree.value!.failedIds.has("a")).toBe(true);
    expect(shell.tree.value!.expansion.isExpanded("a")).toBe(false);
    shell.tree.value!.expansion.toggle("a");
    expect(load).toHaveBeenCalledTimes(2);
    await nextTick();
    scope.stop();
  });
  it("retains detail by row id and composes it with a tree and extras", () => {
    const { scope, shell } = withShell([
      tree<Row>({ getParentId: (row) => row.parent }),
      rowDetail<Row>((row) => h("aside", `Details for ${row.name}`), ["a"]),
      extraRows([{ key: "separator", kind: "separator", beforeRowId: "a" }]),
    ]);
    const a = shell.desktop.value.bodySlots!.find((slot) => slot.key === "a");
    expect(a).toMatchObject({
      kind: "row",
      wiring: { detail: { expanded: true } },
    });
    shell.detail.value!.expansion.toggle("a");
    expect(shell.detail.value!.expansion.isExpanded("a")).toBe(false);
    scope.stop();
  });
  it("renders nested tables through their host closure with neutral defaults", async () => {
    const child = vi.fn((defaults) =>
      h("div", { "data-child-label": defaults.tableLabel }, "Nested content")
    );
    const { scope, shell } = withShell([
      nestedTable<Row>(
        (row) =>
          row.id === "a"
            ? { label: "Orders for Ada", table: child }
            : undefined,
        ["a"]
      ),
    ]);
    const vnode = shell.detail.value!.render(required(rows[0]));
    const html = await renderToString(createSSRApp({ render: () => vnode }));
    expect(html).toContain("Orders for Ada");
    expect(child).toHaveBeenCalledWith(
      expect.objectContaining({
        density: "comfortable",
        tableLabel: "Orders for Ada",
        urlSync: false,
      })
    );
    shell.setDensity("compact");
    await renderToString(
      createSSRApp({
        render: () => shell.detail.value!.render(required(rows[0])),
      })
    );
    expect(child).toHaveBeenLastCalledWith(
      expect.objectContaining({ density: "compact" })
    );
    expect(
      await renderToString(
        createSSRApp({
          render: () => shell.detail.value!.render(required(rows[1])),
        })
      )
    ).not.toContain("nested-table");
    scope.stop();
  });
  it("requires kit toggles and renders the same detail on cards", async () => {
    const { scope, shell } = withShell([
      rowDetail<Row>((row) => h("aside", row.name), ["a"]),
    ]);
    const missing = controls();
    delete (missing as { RowDetailToggle?: unknown }).RowDetailToggle;
    expect(() =>
      DesktopTableChrome({ model: shell.desktop.value, slots: missing })
    ).toThrow("RowDetailToggle");
    const html = await renderToString(
      createSSRApp({
        render: () =>
          MobileCardsChrome({ model: shell.mobile.value, slots: controls() }),
      })
    );
    expect(html).toContain('data-adapttable-part="card-detail"');
    expect(html).not.toContain('data-adapttable-part="detail-cell"');
    expect(html).toContain('aria-expanded="true"');
    scope.stop();
  });
  it("suspends KeepAlive loaders and ignores promises from previous epochs", async () => {
    let fail: ((error: Error) => void) | undefined;
    const load = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          fail = reject;
        })
    );
    const shown = shallowRef(true);
    let shell!: ReturnType<typeof useDataTableShell<Row>>;
    const Component = defineComponent({
      setup() {
        shell = useDataTableShell({
          ...options,
          features: [
            tree<Row>({
              getChildren: (row) => row.children,
              hasChildren: () => true,
              onLoadChildren: load,
            }),
          ],
        });
        return () => h("div");
      },
    });
    const el = document.createElement("div");
    const app = createApp({
      render: () =>
        h(KeepAlive, null, {
          default: () => (shown.value ? h(Component) : null),
        }),
    });
    app.mount(el);
    await nextTick();
    shell.tree.value!.expansion.toggle("a");
    const oldFail = fail!;
    shown.value = false;
    await nextTick();
    shell.tree.value!.expansion.toggle("b");
    expect(load).toHaveBeenCalledTimes(1);
    shown.value = true;
    await nextTick();
    oldFail(new Error("old"));
    await Promise.resolve();
    await nextTick();
    expect(shell.tree.value!.failedIds.size).toBe(0);
    expect(shell.tree.value!.expansion.isExpanded("a")).toBe(true);
    app.unmount();
  });
  it("keeps SSR request state isolated and never fetches during rendering", async () => {
    const load = vi.fn();
    const render = (ids: readonly string[]) =>
      renderToString(
        createSSRApp({
          setup() {
            const shell = useDataTableShell({
              ...options,
              features: [
                tree<Row>({
                  getChildren: (row) => row.children,
                  hasChildren: () => true,
                  defaultExpandedIds: ids,
                  onLoadChildren: load,
                }),
                rowDetail<Row>((row) => row.name, ids),
              ],
            });
            return () =>
              DesktopTableChrome({
                model: shell.desktop.value,
                slots: controls(),
              });
          },
        })
      );
    const [open, closed] = await Promise.all([render(["a"]), render([])]);
    expect(open).toContain('data-adapttable-part="detail-row"');
    expect(closed).not.toContain('data-adapttable-part="detail-row"');
    expect(load).not.toHaveBeenCalled();
  });
});

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Expected fixture value");
  return value;
}
