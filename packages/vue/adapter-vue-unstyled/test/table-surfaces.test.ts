import {
  type ColumnDef,
  type ConfirmRequest,
  type HeaderContext,
  type TableSource,
  useFrontendData,
} from "@adapttable/vue";
import {
  ACTIVE_FILTER_CHIPS,
  type ActiveFilterChipsSlotProps,
  extendFeature,
  slotRender,
  TOOLBAR_EXTRAS,
} from "@adapttable/vue/adapter";
import { filters as bindingFilters } from "@adapttable/vue/features";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  computed,
  createSSRApp,
  defineComponent,
  Fragment,
  h,
  KeepAlive,
  shallowRef,
  type VNodeChild,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable, type DataTableProps } from "../src";
import { exportCsv } from "../src/export";
import { filters } from "../src/filters";
import { rowActions } from "../src/row-actions";
import {
  deferred,
  find,
  mountNative,
  part,
  tick,
} from "./filter-editing-helpers";

interface Row {
  id: string;
  name: string;
  team: string;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", team: "Core" },
  { id: "b", name: "Bea", team: "Design" },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", sortable: true },
  { key: "team", sortable: true },
];
const base: DataTableProps<Row> = {
  data: rows,
  columns,
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
};
afterEach(() => vi.restoreAllMocks());

describe("native table surfaces", () => {
  it("keeps nonempty rows visible while refreshing instead of replacing them with skeletons", async () => {
    const props = shallowRef<DataTableProps<Row>>({
      ...base,
      isLoading: false,
      isFetching: false,
    });
    const view = mountNative(() => h(DataTable<Row>, props.value));
    props.value = { ...props.value, isFetching: true };
    await tick();
    expect(view.host.querySelector(part("loading"))).toBeNull();
    expect(view.host.querySelectorAll("tbody [data-row-id]")).toHaveLength(2);
    expect(view.host.textContent).toContain("Ada");
    expect(view.host.querySelector(part("refresh-indicator"))).not.toBeNull();
  });

  it.each([false, true])(
    "renders semantic loading geometry and honors replacement slots (mobile=%s)",
    async (forceMobile) => {
      const props = shallowRef<DataTableProps<Row>>({
        ...base,
        forceMobile,
        data: [],
        isLoading: true,
        skeletonRows: 3,
        classNames: {
          loadingLine: "line",
          loadingTable: "skeleton",
          loadingCard: "placeholder",
        },
      });
      const custom = shallowRef(false);
      const view = mountNative(() =>
        h(
          DataTable<Row>,
          props.value,
          custom.value ? { loading: () => h("p", "Host progress") } : {}
        )
      );
      const region = find(view.host, part("loading"));
      expect(region.getAttribute("role")).toBe("status");
      expect(region.getAttribute("aria-busy")).toBe("true");
      expect(
        region.querySelectorAll(
          part(forceMobile ? "loading-card" : "loading-row")
        )
      ).toHaveLength(3);
      if (!forceMobile) {
        expect(find(region, part("loading-table")).tagName).toBe("TABLE");
        expect(
          region.querySelectorAll(part("loading-header-cell"))
        ).toHaveLength(2);
        expect(region.querySelectorAll(part("loading-cell"))).toHaveLength(6);
      }
      expect(find(region, part("loading-line")).className).toBe("line");
      expect(
        find(
          region,
          part(forceMobile ? "loading-cards" : "loading-table")
        ).getAttribute("aria-hidden")
      ).toBe("true");
      custom.value = true;
      await tick();
      expect(region.textContent).toBe("Host progress");
      expect(region.querySelector(part("loading-line"))).toBeNull();
      props.value = { ...props.value, data: rows, isLoading: false };
      await tick();
      expect(view.host.querySelector(part("loading"))).toBeNull();
      expect(find(view.host, part("search-icon")).tagName.toLowerCase()).toBe(
        "svg"
      );
    }
  );

  it.each([false, true])(
    "uses the same guarded native actions in strip and menu (mobile=%s)",
    async (forceMobile) => {
      const run = vi.fn();
      const disabled = vi.fn();
      const props = shallowRef<DataTableProps<Row>>({
        ...base,
        forceMobile,
        rowActionsLayout: "menu",
        classNames: {
          actionButton: "canonical",
          rowAction: "legacy",
          rowActionsMenu: "menu",
          rowActionsTrigger: "trigger",
        },
        features: [
          rowActions<Row>([
            { key: "open", label: "Open", onClick: run },
            {
              key: "locked",
              label: "Locked",
              onClick: disabled,
              disabledReason: () => "Read only",
            },
            {
              key: "hidden",
              label: "Hidden",
              onClick: run,
              isHidden: () => true,
            },
          ]),
        ],
      });
      const bubbling = vi.fn();
      const view = mountNative(() =>
        h("div", { onClick: bubbling }, [h(DataTable<Row>, props.value)])
      );
      await tick();
      const menu = find<HTMLDetailsElement>(
        view.host,
        part("row-actions-menu")
      );
      expect(menu.tagName).toBe("DETAILS");
      expect(menu.className).toBe("menu");
      expect(find(menu, part("row-actions-trigger")).tagName).toBe("SUMMARY");
      expect(menu.querySelectorAll(part("action-button"))).toHaveLength(2);
      const locked = find<HTMLButtonElement>(menu, '[aria-label="Locked"]');
      expect(locked.disabled).toBe(true);
      expect(locked.title).toBe("Read only");
      locked.click();
      expect(disabled).not.toHaveBeenCalled();
      menu.open = true;
      const action = find<HTMLButtonElement>(menu, '[aria-label="Open"]');
      expect(action.classList.contains("canonical")).toBe(true);
      expect(action.classList.contains("legacy")).toBe(true);
      action.click();
      expect(run).toHaveBeenCalledExactlyOnceWith(rows[0]);
      expect(menu.open).toBe(false);
      expect(bubbling).not.toHaveBeenCalled();
      menu.open = true;
      locked.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
      expect(menu.open).toBe(false);
      expect(document.activeElement).toBe(find(menu, "summary"));
      props.value = { ...props.value, rowActionsLayout: "buttons" };
      await tick();
      expect(view.host.querySelector(part("row-actions-menu"))).toBeNull();
      expect(view.host.querySelectorAll(part("action-button"))).toHaveLength(4);
      props.value = { ...props.value, features: [] };
      await tick();
      action.click();
      expect(run).toHaveBeenCalledOnce();
    }
  );

  it("closes its disclosure before confirmation and retires a pending confirmation with the feature", async () => {
    const run = vi.fn();
    const requests: ConfirmRequest[] = [];
    let surface: ParentNode = document.body;
    const confirm = vi.fn((request: ConfirmRequest) => {
      expect(
        find<HTMLDetailsElement>(surface, part("row-actions-menu")).open
      ).toBe(false);
      requests.push(request);
    });
    const props = shallowRef<DataTableProps<Row>>({
      ...base,
      rowActionsLayout: "menu",
      confirm,
      features: [
        rowActions<Row>([
          {
            key: "remove",
            label: "Remove",
            onClick: run,
            confirm: {
              title: "Remove row",
              message: (row) => row.name,
              confirmLabel: "Remove",
            },
          },
        ]),
      ],
    });
    const view = mountNative(() => h(DataTable<Row>, props.value));
    surface = view.host;
    await tick();
    const menu = find<HTMLDetailsElement>(view.host, part("row-actions-menu"));
    const button = find<HTMLButtonElement>(menu, part("action-button"));
    menu.open = true;
    button.click();
    expect(confirm).toHaveBeenCalledOnce();
    expect(run).not.toHaveBeenCalled();
    requests[0]!.onConfirm();
    expect(run).toHaveBeenCalledExactlyOnceWith(rows[0]);
    menu.open = true;
    button.click();
    props.value = { ...props.value, features: [] };
    await tick();
    requests[1]!.onConfirm();
    expect(run).toHaveBeenCalledOnce();
  });

  it("leaves a host disclosure open when an inline action is chosen", async () => {
    const run = vi.fn();
    const view = mountNative(() =>
      h("details", { open: true }, [
        h("summary", "Host disclosure"),
        h(DataTable<Row>, {
          ...base,
          rowActionsLayout: "buttons",
          features: [
            rowActions<Row>([{ key: "open", label: "Open", onClick: run }]),
          ],
        }),
      ])
    );
    await tick();
    find<HTMLButtonElement>(view.host, part("action-button")).click();
    expect(run).toHaveBeenCalledExactlyOnceWith(rows[0]);
    expect(find<HTMLDetailsElement>(view.host, "details").open).toBe(true);
  });

  it("preserves default sorting while header actions use column/slot precedence", async () => {
    const run = vi.fn();
    const own: readonly ColumnDef<Row>[] = [
      {
        ...columns[0]!,
        headerActions: ({ label }) =>
          h("button", { onClick: run }, `Inspect ${label}`),
      },
      columns[1]!,
    ];
    const view = mountNative(() =>
      h(
        DataTable<Row>,
        {
          ...base,
          columns: own,
          multiSort: true,
          classNames: { sortIndex: "rank", headerActions: "actions" },
        },
        {
          headerActions: ({ label }: HeaderContext<Row>) =>
            h("span", `Fallback ${label}`),
        }
      )
    );
    const sorters = view.host.querySelectorAll<HTMLButtonElement>(
      part("sort-button")
    );
    sorters[0]!.click();
    sorters[1]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true })
    );
    await tick();
    expect(
      [...view.host.querySelectorAll(part("sort-index"))].map(
        (node) => node.textContent
      )
    ).toEqual(["1", "2"]);
    expect(find(view.host, part("sort-index")).className).toBe("rank");
    const actions = view.host.querySelectorAll(part("header-actions"));
    expect(actions[0]!.textContent).toBe("Inspect Name");
    expect(actions[1]!.textContent).toBe("Fallback Team");
    find<HTMLButtonElement>(actions[0]!, "button").click();
    expect(run).toHaveBeenCalledOnce();
    expect(
      [...view.host.querySelectorAll(part("sort-index"))].map(
        (node) => node.textContent
      )
    ).toEqual(["1", "2"]);
  });

  it("uses Vue child semantics for header actions and follows live renderer/slot replacement", async () => {
    const value = shallowRef<VNodeChild>(false);
    const fallback = shallowRef<VNodeChild>(false);
    const owned = shallowRef<readonly ColumnDef<Row>[]>([
      { ...columns[0]!, headerActions: () => value.value },
      columns[1]!,
      { key: "flag", accessor: () => false },
    ]);
    const view = mountNative(() =>
      h(
        DataTable<Row>,
        { ...base, columns: owned.value },
        {
          headerActions: () => fallback.value,
        }
      )
    );
    expect(view.host.querySelectorAll(part("header-actions"))).toHaveLength(0);
    value.value = h(Fragment, null, [false, null]);
    fallback.value = " ";
    await tick();
    expect(view.host.querySelectorAll(part("header-actions"))).toHaveLength(0);
    value.value = 0;
    fallback.value = null;
    await tick();
    expect(find(view.host, part("header-actions")).textContent).toBe("0");
    value.value = [false, [true, h("strong", "Note")]];
    fallback.value = 0;
    await tick();
    expect(
      [...view.host.querySelectorAll(part("header-actions"))].map(
        (node) => node.textContent
      )
    ).toEqual(["Note", "0", "0"]);
    expect(
      find(view.host, '[data-row-id="a"] [data-column-key="flag"]').textContent
    ).toBe("false");
    owned.value = [
      { ...columns[0]!, headerActions: () => h("b", "Replacement") },
      columns[1]!,
    ];
    fallback.value = h("em", "Fallback");
    await tick();
    expect(
      [...view.host.querySelectorAll(part("header-actions"))].map(
        (node) => node.textContent
      )
    ).toEqual(["Replacement", "Fallback"]);
    owned.value = columns;
    await tick();
    expect(
      [...view.host.querySelectorAll(part("header-actions"))].map(
        (node) => node.textContent
      )
    ).toEqual(["Fallback", "Fallback"]);
    expect(view.host.querySelectorAll(part("sort-button"))).toHaveLength(2);
  });

  it("shows the native export busy affordance for the live request only", async () => {
    const job = deferred<void>();
    const request = vi.fn(() => job.promise);
    const view = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        features: [exportCsv<Row>({ request })],
        classNames: { exportSpinner: "busy" },
      })
    );
    await tick();
    const button = find<HTMLButtonElement>(
      view.host,
      part("export-csv-button")
    );
    button.click();
    button.click();
    await tick();
    expect(request).toHaveBeenCalledOnce();
    expect(button.disabled).toBe(true);
    const spinner = find(button, part("export-spinner"));
    expect(spinner.tagName.toLowerCase()).toBe("svg");
    expect(spinner.getAttribute("class")).toBe("busy");
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
    job.resolve();
    await tick();
    expect(button.querySelector(part("export-spinner"))).toBeNull();
    expect(button.disabled).toBe(false);
  });

  it("hydrates native menu and header-action surfaces without mismatches", async () => {
    const component = defineComponent({
      setup: () => () =>
        h(DataTable<Row>, {
          ...base,
          rowActionsLayout: "menu",
          features: [
            rowActions<Row>([{ key: "open", label: "Open", onClick: vi.fn() }]),
          ],
          columns: [
            { key: "name", headerActions: () => h("span", "Header note") },
          ],
        }),
    });
    const target = document.createElement("div");
    target.innerHTML = await renderToString(createSSRApp(component));
    document.body.append(target);
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    const app = createSSRApp(component);
    app.mount(target);
    await tick();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(target.querySelectorAll(part("row-actions-menu"))).toHaveLength(2);
    expect(find(target, part("header-actions")).textContent).toBe(
      "Header note"
    );
    app.unmount();
    target.remove();
  });
});

describe("active filter chip ownership", () => {
  it("removes current array entries, respects rejection, removes tree leaves and clears only filters", async () => {
    let source!: ReturnType<typeof useFrontendData<Row>>;
    const accept = shallowRef(false);
    const request = vi.fn(
      (key: string, value: Parameters<TableSource<Row>["setExtra"]>[1]) => {
        if (accept.value) source.value.setExtra(key, value);
      }
    );
    const clearRequest = vi.fn(() => {
      if (accept.value) source.value.clearExtras();
    });
    const tree = shallowRef<TableSource<Row>["filterTree"]>({
      combinator: "and",
      conditions: [{ key: "name", op: "contains", value: "a" }],
    });
    const replaceTree = vi.fn((value: TableSource<Row>["filterTree"]) => {
      tree.value = value;
    });
    const component = defineComponent({
      setup() {
        source = useFrontendData<Row>({
          data: rows,
          columns,
          getRowId: (row) => row.id,
          urlSync: false,
          arrayExtraKeys: ["team"],
        });
        source.value.setExtra("team", ["Core", "Design"]);
        source.value.setSearch("Ada");
        const controlled = computed(() => ({
          ...source.value,
          setExtra: request,
          clearExtras: clearRequest,
          filterTree: tree.value,
          setFilterTree: replaceTree,
        }));
        return () =>
          h(DataTable<Row>, {
            ...base,
            data: undefined,
            source: controlled.value,
            features: [
              filters<Row>([
                {
                  key: "team",
                  type: "multiSelect",
                  options: [
                    { value: "Core", label: "Core" },
                    { value: "Design", label: "Design" },
                  ],
                },
                { key: "name", type: "text" },
              ]),
            ],
            classNames: { chips: "chips", chip: "chip", chipRemove: "remove" },
          });
      },
    });
    const view = mountNative(() => h(component));
    await tick();
    const chips = () => find(view.host, part("chips"));
    expect(chips().tagName).toBe("UL");
    expect(chips().className).toBe("chips");
    const removeCore = find<HTMLButtonElement>(
      chips(),
      'button[aria-label*="Core"]'
    );
    removeCore.click();
    await tick();
    expect(request).toHaveBeenCalledExactlyOnceWith("team", ["Design"]);
    expect(chips().textContent).toContain("Core");
    accept.value = true;
    source.value.setExtra("team", ["Core", "Design", "Other"]);
    await tick();
    removeCore.click();
    await tick();
    expect(source.value.extra.team).toEqual(["Design", "Other"]);
    const treeChip = find<HTMLButtonElement>(
      chips(),
      'button[aria-label*="Name"]'
    );
    treeChip.click();
    await tick();
    expect(replaceTree).toHaveBeenCalledOnce();
    expect(tree.value).toBeUndefined();
    const clear = [...chips().querySelectorAll<HTMLButtonElement>("button")].at(
      -1
    )!;
    accept.value = false;
    await tick();
    clear.click();
    await tick();
    expect(clearRequest).toHaveBeenCalledOnce();
    expect(source.value.extra.team).toEqual(["Design", "Other"]);
    expect(view.host.querySelector(part("chips"))).not.toBeNull();
    accept.value = true;
    await tick();
    clear.click();
    await tick();
    expect(clearRequest).toHaveBeenCalledTimes(2);
    expect(source.value.extra.team).toBeUndefined();
    expect(source.value.search).toBe("Ada");
    expect(view.host.querySelector(part("chips"))).toBeNull();
  });

  it("retires retained chip/clear controls across source replacement, KeepAlive and disposal", async () => {
    const shown = shallowRef(true);
    const replacement = shallowRef(false);
    const refresh = shallowRef(0);
    const dataRows = shallowRef(rows);
    let first!: ReturnType<typeof useFrontendData<Row>>;
    let second!: ReturnType<typeof useFrontendData<Row>>;
    let current!: ActiveFilterChipsSlotProps;
    const feature = extendFeature(
      bindingFilters<Row>([{ key: "team", type: "text" }]),
      [
        slotRender(TOOLBAR_EXTRAS, () => null),
        slotRender(ACTIVE_FILTER_CHIPS, (props) => {
          current = props;
          return null;
        }),
      ]
    );
    const component = defineComponent({
      setup() {
        first = useFrontendData<Row>({
          data: dataRows,
          columns,
          getRowId: (row) => row.id,
          urlSync: false,
        });
        second = useFrontendData<Row>({
          data: rows,
          columns,
          getRowId: (row) => row.id,
          urlSync: false,
        });
        first.value.setExtra("team", "Core");
        second.value.setExtra("team", "Design");
        return () =>
          h(DataTable<Row>, {
            ...base,
            data: undefined,
            source: {
              ...(replacement.value ? second.value : first.value),
              isFetching: refresh.value % 2 === 1,
            },
            features: [feature],
          });
      },
    });
    const view = mountNative(() =>
      h(KeepAlive, null, { default: () => (shown.value ? h(component) : null) })
    );
    await tick();
    const sameOwner = current;
    refresh.value++;
    dataRows.value = [...rows];
    await tick();
    sameOwner.chips[0]!.onRemove();
    await tick();
    expect(first.value.extra.team).toBeUndefined();
    first.value.setExtra("team", "Core");
    await tick();
    const retained = current;
    replacement.value = true;
    await tick();
    retained.chips[0]!.onRemove();
    retained.onClearAll();
    expect(first.value.extra.team).toBe("Core");
    expect(second.value.extra.team).toBe("Design");
    const suspended = current;
    shown.value = false;
    await tick();
    suspended.chips[0]!.onRemove();
    expect(second.value.extra.team).toBe("Design");
    shown.value = true;
    await tick();
    suspended.chips[0]!.onRemove();
    expect(second.value.extra.team).toBe("Design");
    const last = current;
    view.stop();
    last.chips[0]!.onRemove();
    last.onClearAll();
    expect(second.value.extra.team).toBe("Design");
  });
});
