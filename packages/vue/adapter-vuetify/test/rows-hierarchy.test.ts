import type { ColumnLayoutState, RowPinState } from "@adapttable/vue";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi-svg";

import { DataTable, type DataTableProps } from "../src";
import {
  collapsibleColumnGroups,
  fitColumns,
  multiSort,
  resizableColumns,
} from "../src/columns";
import { nestedTable, rowDetail } from "../src/row-detail";
import {
  cellSpan,
  extraRows,
  pinnedSummaryRows,
  rowActions,
  rowAppearance,
  rowPinning,
} from "../src/rows";
import { tree } from "../src/tree";

interface Person {
  id: string;
  name: string;
  team: string;
  score: number;
  parent?: string;
}
const people: readonly Person[] = [
  { id: "ada", name: "Ada", team: "Platform", score: 10 },
  { id: "bea", name: "Bea", team: "Platform", score: 20, parent: "ada" },
  { id: "cal", name: "Cal", team: "Design", score: 30 },
];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function fixture(
  overrides: Partial<DataTableProps<Person>> = {},
  events: Record<string, unknown> = {}
) {
  const props = shallowRef<DataTableProps<Person>>({
    data: people,
    columns: [
      { key: "name", header: "Name", sortable: true },
      { key: "score", header: "Score", sortable: true },
    ],
    rowKey: (row) => row.id,
    urlSync: false,
    searchable: false,
    forceMobile: false,
    ...overrides,
  });
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    setup: () => () => h(DataTable<Person>, { ...props.value, ...events }),
  }).use(
    createVuetify({
      ssr: true,
      icons: { defaultSet: "mdi", aliases, sets: { mdi } },
    })
  );
  app.mount(host);
  cleanups.push(() => {
    app.unmount();
    host.remove();
  });
  return { host, props };
}
function node<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const value = root.querySelector<T>(selector);
  if (!value) throw new Error(`Missing ${selector}`);
  return value;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function settle(): Promise<void> {
  await nextTick();
  await nextTick();
}

it("renders binding-calculated spans around extra rows and keeps complete mobile fields", async () => {
  const { host, props } = fixture({
    features: [
      cellSpan<Person>(({ row, column }) =>
        row.id === "ada" && column.key === "name" ? { rowSpan: 2 } : undefined
      ),
      extraRows([
        {
          key: "note",
          kind: "fullWidth",
          beforeRowId: "bea",
          render: () => h("strong", "Team note"),
        },
      ]),
    ],
  });
  await settle();
  expect(
    node<HTMLTableCellElement>(host, '[data-row-id="ada"] td').rowSpan
  ).toBe(3);
  expect(node(host, '[data-row-id="bea"]').querySelectorAll("td")).toHaveLength(
    1
  );
  expect(node(host, part("full-width-row")).textContent).toContain("Team note");
  props.value = { ...props.value, forceMobile: true };
  await settle();
  const card = node(host, 'article[data-row-id="bea"]');
  expect(card.classList.contains("v-card")).toBe(true);
  expect(card.textContent).toContain("Bea");
  expect(card.querySelectorAll("dd")).toHaveLength(2);
  expect(host.querySelector("[rowspan]")).toBeNull();
  expect(node(host, part("full-width-row")).classList.contains("v-sheet")).toBe(
    true
  );
});

it.each([false, true])(
  "renders independent summaries and appearance without selecting summary records, mobile=%s",
  async (mobile) => {
    const { host } = fixture({
      forceMobile: mobile,
      selectable: true,
      features: [
        pinnedSummaryRows<Person>({
          top: [{ id: "total", name: "Total", team: "All", score: 60 }],
        }),
        rowAppearance<Person>({
          rowClassName: (row) => `record-${row.id}`,
          rowStyle: (row) => ({ opacity: row.id === "ada" ? 0.5 : 1 }),
        }),
      ],
    });
    await settle();
    expect(host.textContent).toContain("Total");
    const summary = node(host, part("pinned-summary-top"));
    expect(summary.querySelector("input[type=checkbox]")).toBeNull();
    expect(
      host.querySelectorAll(
        mobile ? "article input[type=checkbox]" : "tbody input[type=checkbox]"
      )
    ).toHaveLength(3);
    const first = node(host, '[data-row-id="ada"]');
    expect(first.classList.contains("record-ada")).toBe(true);
    expect(first.style.opacity).toBe("0.5");
  }
);

it("keeps row pin requests controlled through real Vuetify action buttons", async () => {
  const state = shallowRef<RowPinState>({ top: [], bottom: [] });
  const change = vi.fn();
  const { host } = fixture({
    features: [
      rowPinning({ pinnedRowIds: state, onPinnedRowIdsChange: change }),
    ],
  });
  await settle();
  const row = node(host, '[data-row-id="cal"]');
  const action = [...row.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.getAttribute("aria-label")?.includes("top")
  );
  if (!action) throw new Error("Missing top pin action");
  expect(action.classList.contains("v-btn")).toBe(true);
  action.click();
  await settle();
  expect(change).toHaveBeenCalledExactlyOnceWith({ top: ["cal"], bottom: [] });
  expect(
    host.querySelector("tbody [data-row-id]")?.getAttribute("data-row-id")
  ).toBe("ada");
  state.value = { top: ["cal"], bottom: [] };
  await settle();
  expect(
    host.querySelector("tbody [data-row-id]")?.getAttribute("data-row-id")
  ).toBe("cal");
});

it.each([false, true])(
  "uses Vuetify tree and detail controls without leaking row click events, mobile=%s",
  async (mobile) => {
    const clicked = vi.fn();
    const { host } = fixture(
      {
        forceMobile: mobile,
        features: [
          tree<Person>({ getParentId: (row) => row.parent }),
          rowDetail<Person>((row) => h("p", `Detail for ${row.name}`)),
        ],
        classNames: {
          treeToggle: "tree-control",
          expandToggle: "detail-control",
        },
      },
      { onClick: clicked }
    );
    await settle();
    expect(host.textContent).not.toContain("Bea");
    const toggle = node<HTMLButtonElement>(host, part("tree-toggle"));
    expect(toggle.classList.contains("v-btn")).toBe(true);
    expect(toggle.classList.contains("tree-control")).toBe(true);
    toggle.click();
    await settle();
    expect(host.textContent).toContain("Bea");
    const detail = node<HTMLButtonElement>(host, part("expand-button"));
    expect(detail.classList.contains("v-btn")).toBe(true);
    expect(detail.classList.contains("detail-control")).toBe(true);
    detail.click();
    await settle();
    expect(host.textContent).toContain("Detail for Ada");
    expect(clicked).not.toHaveBeenCalled();
  }
);

it("preserves rejected and accepted expansion state without recreating features", async () => {
  const treeIds = shallowRef<readonly string[]>([]);
  const detailIds = shallowRef<readonly string[]>([]);
  const treeChange = vi.fn();
  const detailChange = vi.fn();
  const { host } = fixture({
    features: [
      tree<Person>({
        getParentId: (row) => row.parent,
        expandedIds: treeIds,
        onExpandedIdsChange: treeChange,
      }),
      rowDetail<Person>((row) => h("p", `Detail for ${row.name}`), undefined, {
        expandedRowIds: detailIds,
        onExpandedRowIdsChange: detailChange,
      }),
    ],
  });
  await settle();
  node<HTMLButtonElement>(host, part("tree-toggle")).click();
  node<HTMLButtonElement>(host, part("expand-button")).click();
  await settle();
  expect(treeChange).toHaveBeenCalledExactlyOnceWith(["ada"]);
  expect(detailChange).toHaveBeenCalledExactlyOnceWith(["ada"]);
  expect(host.textContent).not.toContain("Bea");
  expect(host.textContent).not.toContain("Detail for Ada");
  treeIds.value = ["ada"];
  detailIds.value = ["ada"];
  await settle();
  expect(host.textContent).toContain("Bea");
  expect(host.textContent).toContain("Detail for Ada");
});

it.each(["ltr", "rtl"] as const)(
  "forwards the binding's directional tree keyboard actions in %s",
  async (dir) => {
    const { host } = fixture({
      dir,
      features: [tree<Person>({ getParentId: (row) => row.parent })],
    });
    await settle();
    const toggle = node<HTMLButtonElement>(host, part("tree-toggle"));
    const open = new KeyboardEvent("keydown", {
      key: dir === "rtl" ? "ArrowLeft" : "ArrowRight",
      bubbles: true,
      cancelable: true,
    });
    toggle.dispatchEvent(open);
    await settle();
    expect(open.defaultPrevented).toBe(true);
    expect(host.textContent).toContain("Bea");
    toggle.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: dir === "rtl" ? "ArrowRight" : "ArrowLeft",
        bubbles: true,
      })
    );
    await settle();
    expect(host.textContent).not.toContain("Bea");
  }
);

it("shows genuine Vuetify lazy-load progress and retires retained tree controls", async () => {
  let complete: (() => void) | undefined;
  const load = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      })
  );
  const { host, props } = fixture({
    features: [
      tree<Person>({
        getChildren: () => undefined,
        hasChildren: () => true,
        onLoadChildren: load,
      }),
    ],
  });
  await settle();
  const toggle = node<HTMLButtonElement>(host, part("tree-toggle"));
  toggle.click();
  await settle();
  expect(load).toHaveBeenCalledExactlyOnceWith(people[0]);
  expect(toggle.getAttribute("aria-busy")).toBe("true");
  expect(toggle.querySelector(".v-progress-circular")).not.toBeNull();
  complete?.();
  await Promise.resolve();
  await settle();
  expect(toggle.hasAttribute("aria-busy")).toBe(false);
  props.value = { ...props.value, features: [] };
  await settle();
  toggle.click();
  expect(load).toHaveBeenCalledOnce();
});

it("keeps a live detail editor and focus across unrelated parent renders", async () => {
  const Detail = defineComponent({
    setup: () => () =>
      h("input", { value: "Initial", "aria-label": "Detail note" }),
  });
  const { host, props } = fixture({
    features: [rowDetail<Person>(() => h(Detail), ["ada"])],
  });
  await settle();
  const input = node<HTMLInputElement>(host, 'input[aria-label="Detail note"]');
  input.value = "Unsaved note";
  input.focus();
  props.value = { ...props.value, classNames: { root: "updated" } };
  await settle();
  expect(node(host, 'input[aria-label="Detail note"]')).toBe(input);
  expect(input.value).toBe("Unsaved note");
  expect(document.activeElement).toBe(input);
});

it("renders a host-provided nested Vuetify table with inherited density", async () => {
  const { host } = fixture({
    density: "compact",
    features: [
      nestedTable<Person>(
        (row) => ({
          label: `Children of ${row.name}`,
          table: (defaults) =>
            h(DataTable<{ id: string; label: string }>, {
              ...defaults,
              data: [{ id: "child", label: `Child of ${row.name}` }],
              columns: [{ key: "label" }],
              rowKey: (child) => child.id,
              searchable: false,
              urlSync: false,
              forceMobile: false,
            }),
        }),
        ["ada"]
      ),
    ],
  });
  await settle();
  expect(host.textContent).toContain("Child of Ada");
  expect(host.querySelectorAll(".v-table--density-compact")).toHaveLength(2);
  expect(node(host, part("nested-table")).getAttribute("aria-label")).toBe(
    "Children of Ada"
  );
});

it("requests a host action once and rechecks disabled state on a retained control", async () => {
  const invoke = vi.fn();
  let disabled = false;
  const { host } = fixture({
    features: [
      rowActions<Person>([
        {
          key: "open",
          label: "Open profile",
          onClick: invoke,
          isDisabled: () => disabled,
        },
      ]),
    ],
  });
  await settle();
  const action = node<HTMLButtonElement>(
    host,
    'button[aria-label="Open profile"]'
  );
  expect(action.classList.contains("v-btn")).toBe(true);
  action.click();
  expect(invoke).toHaveBeenCalledExactlyOnceWith(people[0]);
  disabled = true;
  action.click();
  expect(invoke).toHaveBeenCalledOnce();
});

it("keeps grouped-column collapse controlled through the real Vuetify button", async () => {
  const layout: ColumnLayoutState = {
    hidden: [],
    order: [],
    widths: {},
    pinned: {},
    collapsedGroups: [],
  };
  const requested = vi.fn();
  const { host, props } = fixture(
    {
      columns: [
        {
          header: "Person",
          collapsedKey: "name",
          children: [{ key: "name" }, { key: "score" }],
        },
      ],
      columnLayout: layout,
      features: [collapsibleColumnGroups()],
    },
    { "onUpdate:columnLayout": requested }
  );
  await settle();
  const toggle = node<HTMLButtonElement>(host, part("column-group-toggle"));
  expect(toggle.classList.contains("v-btn")).toBe(true);
  toggle.click();
  await settle();
  expect(requested).toHaveBeenCalledOnce();
  expect(toggle.getAttribute("aria-expanded")).toBe("true");
  props.value = {
    ...props.value,
    columnLayout: { ...layout, collapsedGroups: ["Person"] },
  };
  await settle();
  expect(
    node(host, part("column-group-toggle")).getAttribute("aria-expanded")
  ).toBe("false");
  expect(node(host, '[data-row-id="ada"]').querySelectorAll("td")).toHaveLength(
    1
  );
});

it("forwards resize keys while fit and multi-sort remain binding models", async () => {
  const requested = vi.fn();
  const { host } = fixture(
    {
      features: [resizableColumns(), fitColumns(), multiSort()],
      defaultColumnLayout: { widths: { name: 120, score: 120 } },
    },
    { "onUpdate:columnLayout": requested }
  );
  await settle();
  const resize = node(host, part("resize-handle"));
  expect(resize.tagName).toBe("HR");
  expect(resize.classList.contains("v-divider")).toBe(true);
  const header = resize.closest("th");
  if (!header) throw new Error("Missing native resize measurement header");
  vi.spyOn(header, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 120, 40)
  );
  requested.mockClear();
  resize.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowRight",
      bubbles: true,
      cancelable: true,
    })
  );
  await settle();
  expect(requested).toHaveBeenCalledOnce();
  expect(requested).toHaveBeenCalledWith(
    expect.objectContaining({ widths: { name: 136, score: 120 } })
  );
  const buttons = host.querySelectorAll<HTMLButtonElement>(part("sort-button"));
  buttons[0]?.click();
  buttons[1]?.dispatchEvent(
    new MouseEvent("click", { bubbles: true, shiftKey: true })
  );
  await settle();
  expect(host.querySelectorAll(part("sort-index"))).toHaveLength(2);
  expect(node<HTMLTableElement>(host, "table").style.width).toBe("100%");
});
