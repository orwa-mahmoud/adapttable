import {
  type ColumnDef,
  type TableSource,
  useFrontendData,
} from "@adapttable/vue";
import type { ComposedFeature, TableRuntime } from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { DataTable, type DataTableProps } from "../src";
interface Row {
  id: string;
  name: string;
  score: number;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", score: 2 },
  { id: "g", name: "Grace", score: 1 },
  { id: "k", name: "Katherine", score: 3 },
];
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", sortable: true },
  { key: "score", sortable: true },
];
const defaults: DataTableProps<Row> = {
  data: rows,
  columns,
  rowKey: (row) => row.id,
  urlSync: false,
  paginationMode: "paged",
  searchDebounceMs: 0,
};
const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const clean of cleanup.splice(0)) clean();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function mount(
  overrides: Partial<DataTableProps<Row>> = {},
  events: Record<string, unknown> = {},
  slots?: Record<string, (...args: never[]) => VNodeChild>
) {
  const props = shallowRef({ ...defaults, ...overrides });
  const element = document.createElement("div");
  document.body.append(element);
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(DataTable<Row>, { ...props.value, ...events }, slots),
    })
  );
  app.mount(element);
  const unmount = (): void => {
    app.unmount();
    element.remove();
  };
  cleanup.push(unmount);
  return { element, props, unmount };
}
function find<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}
async function input(root: ParentNode, value: string) {
  const element = find<HTMLInputElement>(root, 'input[type="search"]');
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  await nextTick();
}
async function click(root: ParentNode, selector: string) {
  find<HTMLElement>(root, selector).click();
  await nextTick();
}
describe("native DataTable", () => {
  it("renders and binds semantic attrs, sort, search, paging and selection on native controls", async () => {
    const update = vi.fn();
    const fixture = mount(
      {
        selectable: true,
        defaults: { limit: 1 },
        tableLabel: "People",
        dir: "rtl",
        classNames: {
          table: "custom-table",
          th: "custom-heading",
          td: "custom-cell",
          sortButton: "custom-sort",
          rowsPerPage: "custom-size",
        },
      },
      { "onUpdate:selectedIds": update, id: "people", class: "host" }
    );
    await nextTick();
    expect(
      find(fixture.element, '[data-adapttable-part="root"]').getAttribute("dir")
    ).toBe("rtl");
    expect(fixture.element.querySelector("#people.host")).not.toBeNull();
    const table = find<HTMLTableElement>(fixture.element, "table");
    expect(table.className).toBe("custom-table");
    expect(table.getAttribute("aria-label")).toBe("People");
    expect(table.getAttribute("aria-rowcount")).toBe("3");
    const heading = find<HTMLElement>(
      fixture.element,
      'th[data-column-key="score"]'
    );
    expect(heading.getAttribute("scope")).toBe("col");
    expect(heading.className).toBe("custom-heading");
    await click(fixture.element, 'th[data-column-key="score"] button');
    expect(heading.getAttribute("aria-sort")).toBe("ascending");
    expect(find(fixture.element, "tbody").textContent).toContain("Grace");
    await click(fixture.element, 'tbody input[type="checkbox"]');
    expect(update).toHaveBeenCalledExactlyOnceWith(["g"]);
    await click(fixture.element, '[data-adapttable-part="page-next"]');
    expect(find(fixture.element, "tbody").textContent).toContain("Ada");
    await input(fixture.element, "Katherine");
    expect(find(fixture.element, "tbody").textContent).toContain("Katherine");
    expect(
      find<HTMLInputElement>(
        fixture.element,
        'input[type="search"]'
      ).getAttribute("aria-label")
    ).toBe("Search");
    expect(
      find(fixture.element, '[data-adapttable-part="status"]').getAttribute(
        "aria-live"
      )
    ).toBe("polite");
  });
  it("keeps controlled selection authoritative and emits exactly one request per action", async () => {
    const update = vi.fn();
    const fixture = mount(
      { selectedIds: [] },
      { "onUpdate:selectedIds": update }
    );
    await click(fixture.element, "tbody input");
    expect(update).toHaveBeenCalledExactlyOnceWith(["a"]);
    expect(find<HTMLInputElement>(fixture.element, "tbody input").checked).toBe(
      false
    );
    fixture.props.value = { ...fixture.props.value, selectedIds: ["g"] };
    await nextTick();
    expect(
      fixture.element.querySelector('tr[data-row-id="g"] input:checked')
    ).not.toBeNull();
    expect(
      find<HTMLInputElement>(fixture.element, "thead input").indeterminate
    ).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
  });
  it("updates controlled selection accepted by the host once without prop-watch feedback", async () => {
    const update = vi.fn((ids: string[]) => {
      fixture.props.value = { ...fixture.props.value, selectedIds: ids };
    });
    const fixture = mount(
      { selectedIds: [] },
      { "onUpdate:selectedIds": update }
    );
    await click(fixture.element, "thead input");
    expect(update).toHaveBeenCalledExactlyOnceWith(["a", "g", "k"]);
    expect(
      fixture.element.querySelectorAll("tbody input:checked")
    ).toHaveLength(3);
  });
  it("renders mobile cards with native sort and selection, respecting RTL and card parts", async () => {
    const fixture = mount({
      forceMobile: true,
      selectable: true,
      dir: "rtl",
      classNames: {
        cards: "cards-custom",
        card: "card-custom",
        cardValue: "value-custom",
      },
    });
    await nextTick();
    expect(fixture.element.querySelector("table")).toBeNull();
    expect(
      find(fixture.element, '[data-adapttable-part="cards"]').getAttribute(
        "dir"
      )
    ).toBe("rtl");
    expect(
      fixture.element.querySelectorAll("article.card-custom")
    ).toHaveLength(3);
    const select = find<HTMLSelectElement>(
      fixture.element,
      '[data-adapttable-part="sort-select"]'
    );
    select.value = "score";
    select.dispatchEvent(new Event("change"));
    await nextTick();
    expect(find(fixture.element, "article").textContent).toContain("Grace");
    await click(fixture.element, '[data-adapttable-part="sort-direction"]');
    expect(find(fixture.element, "article").textContent).toContain("Katherine");
    expect(fixture.element.querySelectorAll("dd.value-custom")).toHaveLength(6);
  });
  it("distinguishes loading, refreshing, empty and no-results states with a working clear action", async () => {
    const fixture = mount({ data: [], isLoading: true });
    expect(
      fixture.element.querySelector('[data-adapttable-part="loading"]')
    ).not.toBeNull();
    fixture.props.value = {
      ...fixture.props.value,
      data: rows,
      isLoading: false,
      isFetching: true,
    };
    await nextTick();
    expect(
      fixture.element.querySelector(
        '[data-adapttable-part="refresh-indicator"]'
      )
    ).not.toBeNull();
    expect(fixture.element.querySelector("table")).not.toBeNull();
    fixture.props.value = { ...fixture.props.value, isFetching: false };
    await nextTick();
    await input(fixture.element, "missing");
    expect(
      find(fixture.element, '[data-adapttable-part="empty"]').textContent
    ).toContain("No results");
    await click(fixture.element, '[data-adapttable-part="empty-clear"]');
    expect(fixture.element.querySelector("table")).not.toBeNull();
    fixture.props.value = { ...fixture.props.value, data: [] };
    await nextTick();
    expect(
      fixture.element.querySelector('[data-adapttable-part="empty-clear"]')
    ).toBeNull();
  });
  it("only offers retry when the source has a real retry callback and preserves stale rows", async () => {
    const refetch = vi.fn();
    const fixture = mount({ error: new Error("network"), refetch });
    expect(fixture.element.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.element.querySelector("table")).not.toBeNull();
    await click(fixture.element, '[data-adapttable-part="retry-button"]');
    expect(refetch).toHaveBeenCalledTimes(1);
    fixture.props.value = { ...fixture.props.value, isFetching: true };
    await nextTick();
    expect(
      find<HTMLButtonElement>(
        fixture.element,
        '[data-adapttable-part="retry-button"]'
      ).disabled
    ).toBe(true);
    fixture.props.value = {
      ...fixture.props.value,
      data: [],
      isFetching: false,
      refetch: undefined,
    };
    await nextTick();
    expect(
      fixture.element.querySelector('[data-adapttable-part="retry-button"]')
    ).toBeNull();
    expect(
      fixture.element.querySelector('[data-adapttable-part="empty"]')
    ).toBeNull();
  });
  it("keeps two tables isolated and host row objects untouched", async () => {
    const one = mount();
    const two = mount();
    const before = rows.map((row) => ({ ...row }));
    await input(one.element, "Ada");
    expect(one.element.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(two.element.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(rows).toEqual(before);
  });
  it("disposes replaced features once and exposes fresh source rows after source replacement", async () => {
    const released = vi.fn();
    const mounted = vi.fn();
    let runtime: TableRuntime<Row> | undefined;
    const feature: ComposedFeature<Row> = {
      id: "observer",
      mount: (context) => {
        mounted();
        runtime = context.runtime;
        return released;
      },
    };
    const scope = effectScope();
    const source = scope.run(() =>
      useFrontendData({
        data: [{ id: "external", name: "External", score: 4 }],
        columns,
        urlSync: false,
      })
    );
    if (!source) throw new Error("Source was not created");
    cleanup.push(() => scope.stop());
    const fixture = mount({ features: [feature] });
    expect(mounted).toHaveBeenCalledTimes(1);
    fixture.props.value = {
      ...fixture.props.value,
      features: [feature],
      source: source.value,
    };
    await nextTick();
    expect(mounted).toHaveBeenCalledTimes(1);
    expect(runtime?.rowAt(0)?.id).toBe("external");
    expect(find(fixture.element, "tbody").textContent).toContain("External");
    fixture.props.value = { ...fixture.props.value, features: [] };
    await nextTick();
    expect(released).toHaveBeenCalledTimes(1);
    fixture.unmount();
    cleanup.pop();
    expect(released).toHaveBeenCalledTimes(1);
    expect(runtime?.view()).toBeUndefined();
  });
  it("cancels pending debounced source mutation when unmounted", async () => {
    vi.useFakeTimers();
    const setSearch = vi.fn();
    const scope = effectScope();
    const result = scope.run(() =>
      useFrontendData({ data: rows, columns, urlSync: false })
    );
    if (!result) throw new Error("Missing source");
    const source: TableSource<Row> = { ...result.value, setSearch };
    const fixture = mount({ source, searchDebounceMs: 100 });
    await nextTick();
    await input(fixture.element, "Grace");
    fixture.unmount();
    cleanup.pop();
    vi.advanceTimersByTime(200);
    expect(setSearch).not.toHaveBeenCalled();
    scope.stop();
  });
  it("hydrates deterministic markup without mismatch and keeps native controls interactive", async () => {
    const component = defineComponent({
      setup: () => () => h(DataTable<Row>, { ...defaults }),
    });
    const html = await renderToString(createSSRApp(component));
    const root = document.createElement("div");
    root.innerHTML = html;
    document.body.append(root);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const app = createSSRApp(component);
    app.mount(root);
    cleanup.push(() => {
      app.unmount();
      root.remove();
    });
    await nextTick();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    await input(root, "Ada");
    expect(root.querySelectorAll("tbody tr")).toHaveLength(1);
  });
});
