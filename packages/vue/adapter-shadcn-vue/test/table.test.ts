import {
  type ColumnDef,
  type TableSource,
  useFrontendData,
} from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type VNode,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable, type DataTableProps } from "../src";
import { densityChooser } from "../src/density";

interface Row {
  id: string;
  name: string;
  score: number;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada", score: 3 },
  { id: "b", name: "Bea", score: 2 },
  { id: "c", name: "Cy", score: 1 },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "score", header: "Score", sortable: true },
];
const base: DataTableProps<Row> = {
  data,
  columns,
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
};
const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.splice(0).forEach((run) => run());
  vi.restoreAllMocks();
});
function node<T extends Element>(root: ParentNode, selector: string): T {
  const result = root.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}
function mount(render: () => VNode) {
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(defineComponent({ setup: () => render }));
  app.mount(root);
  cleanup.push(() => {
    app.unmount();
    root.remove();
  });
  return root;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;

describe("shadcn-vue table surface", () => {
  it("hydrates its semantic table, kit controls and typed cell slots without mismatches", async () => {
    const render = () =>
      h(
        DataTable<Row>,
        {
          ...base,
          selectable: true,
          id: "people",
          classNames: {
            root: "host-root",
            searchInput: "host-search",
            td: "host-cell",
          },
        },
        {
          cell: ({ value, row }: { value: unknown; row: Row }) =>
            `${row.id}: ${String(value)}`,
          tableFooter: () => "Host footer",
        }
      );
    const app = createSSRApp({ render });
    const html = await renderToString(app);
    const root = document.createElement("div");
    root.innerHTML = html;
    document.body.append(root);
    const warn = vi.spyOn(console, "warn");
    const error = vi.spyOn(console, "error");
    const client = createSSRApp({ render });
    client.mount(root);
    cleanup.push(() => {
      client.unmount();
      root.remove();
    });
    await nextTick();
    expect(node(root, "table").tagName).toBe("TABLE");
    expect(node(root, "#people").classList.contains("host-root")).toBe(true);
    expect(node(root, part("search")).getAttribute("data-slot")).toBe("input");
    expect(node(root, part("search")).classList.contains("host-search")).toBe(
      true
    );
    expect(node(root, "td").classList.contains("host-cell")).toBe(false);
    expect(root.querySelector("td.host-cell")).not.toBeNull();
    expect(root.textContent).toContain("a: Ada");
    expect(root.textContent).toContain("Host footer");
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("uses real shadcn buttons for sorting and repeated pagination", async () => {
    const root = mount(() =>
      h(DataTable<Row>, {
        ...base,
        paginationMode: "paged",
        defaults: { limit: 1 },
      })
    );
    const next = node<HTMLButtonElement>(root, part("page-next"));
    expect(next.dataset.slot).toBe("button");
    next.click();
    next.click();
    await nextTick();
    expect(node(root, "tbody").textContent).toContain("Cy");
    node<HTMLButtonElement>(root, part("page-prev")).click();
    await nextTick();
    expect(node(root, "tbody").textContent).toContain("Bea");
    const scoreSort = root.querySelectorAll<HTMLButtonElement>(
      part("sort-button")
    )[1];
    if (!scoreSort) throw new Error("Missing score sort");
    expect(scoreSort.dataset.slot).toBe("button");
    scoreSort.click();
    await nextTick();
    expect(node(root, "tbody").textContent).toContain("Cy");
  });

  it("keeps rejected selection truthful and accepts an explicit host update", async () => {
    const selected = shallowRef<readonly string[]>([]);
    const update = vi.fn();
    const root = mount(() =>
      h(DataTable<Row>, {
        ...base,
        selectedIds: selected.value,
        "onUpdate:selectedIds": update,
      })
    );
    const checkbox = node<HTMLButtonElement>(root, `tbody ${part("checkbox")}`);
    checkbox.click();
    await nextTick();
    checkbox.click();
    await nextTick();
    expect(update).toHaveBeenCalledTimes(2);
    expect(update.mock.calls[0]?.[0]).toEqual(["a"]);
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    selected.value = ["a"];
    await nextTick();
    expect(checkbox.getAttribute("aria-checked")).toBe("true");
  });

  it("sends a single explicit search request without the native listener firing again", async () => {
    const requests = vi.fn();
    const root = document.createElement("div");
    document.body.append(root);
    const app = createApp(
      defineComponent({
        setup() {
          const source = useFrontendData<Row>({
            data,
            columns,
            getRowId: (row) => row.id,
            getSearchText: (row) => row.name,
            urlSync: false,
            forceMobile: false,
          });
          return () => {
            const current: TableSource<Row> = {
              ...source.value,
              setSearch: (value) => {
                requests(value);
                source.value.setSearch(value);
              },
            };
            return h(DataTable<Row>, {
              ...base,
              source: current,
              searchDebounceMs: 0,
            });
          };
        },
      })
    );
    app.mount(root);
    cleanup.push(() => {
      app.unmount();
      root.remove();
    });
    const input = node<HTMLInputElement>(root, part("search"));
    input.value = "Ada";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 10));
    await nextTick();
    expect(requests).toHaveBeenCalledExactlyOnceWith("Ada");
    expect(input.value).toBe("Ada");
    expect(root.querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("renders real RTL cards, semantic field pairs, selections and sort control", async () => {
    const root = mount(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile: true,
        dir: "rtl",
        selectable: true,
      })
    );
    await nextTick();
    expect(node<HTMLElement>(root, part("root")).dir).toBe("rtl");
    expect(root.querySelector("table")).toBeNull();
    const cards = root.querySelectorAll("article[data-slot=card]");
    expect(cards).toHaveLength(3);
    expect(cards[0]?.querySelectorAll("dt")).toHaveLength(2);
    expect(cards[0]?.querySelectorAll("dd")).toHaveLength(2);
    const select = node<HTMLSelectElement>(root, part("sort-select"));
    expect(select.dataset.slot).toBe("native-select");
    expect(select.closest("label")).toBeNull();
    select.value = "score";
    select.dispatchEvent(new Event("change"));
    await nextTick();
    expect(root.querySelector("article")?.textContent).toContain("Cy");
    node<HTMLButtonElement>(root, part("sort-direction")).click();
    await nextTick();
    expect(root.querySelector("article")?.textContent).toContain("Ada");
  });

  it("forwards one density request and retains controlled rejection", async () => {
    const density = shallowRef<"comfortable" | "compact">("comfortable");
    const update = vi.fn();
    const root = mount(() =>
      h(DataTable<Row>, {
        ...base,
        density: density.value,
        features: [densityChooser()],
        "onUpdate:density": update,
      })
    );
    const select = node<HTMLSelectElement>(root, part("density-toggle"));
    select.value = "compact";
    select.dispatchEvent(new Event("change"));
    await nextTick();
    expect(update).toHaveBeenCalledExactlyOnceWith("compact");
    expect(select.value).toBe("comfortable");
    density.value = "compact";
    await nextTick();
    expect(select.value).toBe("compact");
    expect(node<HTMLElement>(root, part("root")).dataset.density).toBe(
      "compact"
    );
  });

  it.each([false, true])(
    "paints kit skeletons and keeps refresh rows visible (mobile=%s)",
    async (forceMobile) => {
      const props = shallowRef<DataTableProps<Row>>({
        ...base,
        data: [],
        forceMobile,
        isLoading: true,
        skeletonRows: 2,
      });
      const root = mount(() => h(DataTable<Row>, props.value));
      expect(
        root.querySelectorAll('[data-slot="skeleton"]').length
      ).toBeGreaterThan(0);
      expect(
        root.querySelectorAll(
          part(forceMobile ? "loading-card" : "loading-row")
        )
      ).toHaveLength(2);
      props.value = { ...base, forceMobile, isFetching: true };
      await nextTick();
      expect(root.querySelector(part("loading"))).toBeNull();
      expect(root.textContent).toContain("Ada");
      expect(root.querySelector(part("refresh-indicator"))).not.toBeNull();
    }
  );
});
