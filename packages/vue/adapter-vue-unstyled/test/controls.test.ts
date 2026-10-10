import type {
  ColumnDef,
  ColumnLayoutState,
  ComposedFeature,
  UseDataTableResult,
} from "@adapttable/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type VNodeChild,
} from "vue";

import { DataTable, type DataTableProps } from "../src";
interface Row {
  id: string;
  name: string;
  score: number;
}
const data: readonly Row[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index),
  name: `Person ${index}`,
  score: index,
}));
const columns: readonly ColumnDef<Row>[] = [
  { key: "name", sortable: true },
  { key: "score", sortable: true },
];
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach((run) => run()));
function mount(
  initial: Partial<DataTableProps<Row>>,
  extra: Record<string, unknown> = {},
  slots?: Record<string, (...args: never[]) => VNodeChild>
) {
  const props = shallowRef<DataTableProps<Row>>({
    data,
    columns,
    rowKey: (row) => row.id,
    urlSync: false,
    paginationMode: "paged",
    ...initial,
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup: () => () => h(DataTable<Row>, { ...props.value, ...extra }, slots),
    })
  );
  app.mount(root);
  cleanup.push(() => {
    app.unmount();
    root.remove();
  });
  return { root, props };
}
function node<T extends Element>(root: ParentNode, selector: string): T {
  const result = root.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}
describe("native control and slot contracts", () => {
  it("uses page size, numbered pages and previous-page actions with a real elided pager", async () => {
    const view = mount({ defaults: { limit: 1 } });
    await nextTick();
    expect(
      view.root.querySelector('[data-adapttable-part="page-ellipsis"]')
    ).not.toBeNull();
    node<HTMLButtonElement>(
      view.root,
      '[data-adapttable-part="page-number"][aria-label="Go to page 12"]'
    ).click();
    await nextTick();
    expect(node(view.root, "tbody").textContent).toContain("Person 11");
    expect(
      node<HTMLButtonElement>(view.root, '[data-adapttable-part="page-next"]')
        .disabled
    ).toBe(true);
    node<HTMLButtonElement>(
      view.root,
      '[data-adapttable-part="page-prev"]'
    ).click();
    await nextTick();
    expect(node(view.root, "tbody").textContent).toContain("Person 10");
    const size = node<HTMLSelectElement>(
      view.root,
      '[data-adapttable-part="rows-per-page"]'
    );
    expect(size.getAttribute("aria-label")).toBe("Rows per page");
    size.focus();
    size.value = "25";
    size.dispatchEvent(new Event("change"));
    await nextTick();
    expect(view.root.querySelectorAll("tbody tr")).toHaveLength(12);
    expect(document.activeElement).toBe(size);
  });
  it("uses the live page for repeated pagination clicks before rerender", async () => {
    const view = mount({ defaults: { limit: 1 } });
    await nextTick();
    const next = node<HTMLButtonElement>(
      view.root,
      '[data-adapttable-part="page-next"]'
    );
    next.click();
    next.click();
    await nextTick();
    expect(node(view.root, "tbody").textContent).toContain("Person 2");
    const previous = node<HTMLButtonElement>(
      view.root,
      '[data-adapttable-part="page-prev"]'
    );
    previous.click();
    previous.click();
    await nextTick();
    expect(node(view.root, "tbody").textContent).toContain("Person 0");
  });
  it("exposes the real focus surface and maps controlled column layout to one update event", async () => {
    let model: UseDataTableResult<Row> | undefined;
    let focus: (() => void) | undefined;
    const feature: ComposedFeature<Row> = {
      id: "inspect",
      mount: (context) => {
        model = context.table;
      },
    };
    const update = vi.fn();
    const layout: ColumnLayoutState = {
      hidden: [],
      order: [],
      widths: {},
      pinned: {},
    };
    const view = mount(
      { columnLayout: layout, features: [feature] },
      {
        "onUpdate:columnLayout": update,
        ref: (value: object | null) => {
          if (value && "focus" in value && typeof value.focus === "function") {
            const focusTable = value.focus;
            focus = () => focusTable();
          }
        },
      }
    );
    focus?.();
    expect(document.activeElement).toBe(
      view.root.querySelector('[data-adapttable-part="scroll-box"]')
    );
    model?.layout.value.setHidden("score", true);
    await nextTick();
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0]?.[0].hidden).toEqual(["score"]);
    expect(
      view.root.querySelector('th[data-column-key="score"]')
    ).not.toBeNull();
    view.props.value = {
      ...view.props.value,
      columnLayout: { ...layout, hidden: ["score"] },
    };
    await nextTick();
    expect(view.root.querySelector('th[data-column-key="score"]')).toBeNull();
    expect(update).toHaveBeenCalledTimes(1);
  });
  it("supports toolbar-only and mobile-only layouts and both native sort directions and clear", async () => {
    const view = mount(
      { searchable: false },
      {},
      {
        toolbar: () =>
          h("button", { "data-testid": "custom-toolbar" }, "Custom action"),
      }
    );
    expect(view.root.querySelector('input[type="search"]')).toBeNull();
    expect(
      view.root.querySelector('[data-testid="custom-toolbar"]')
    ).not.toBeNull();
    view.props.value = { ...view.props.value, forceMobile: true };
    await nextTick();
    const select = node<HTMLSelectElement>(
      view.root,
      '[data-adapttable-part="sort-select"]'
    );
    expect(select.getAttribute("aria-label")).toBe("Sort by");
    select.focus();
    select.value = "score";
    select.dispatchEvent(new Event("change"));
    await nextTick();
    expect(document.activeElement).toBe(select);
    const direction = node<HTMLButtonElement>(
      view.root,
      '[data-adapttable-part="sort-direction"]'
    );
    direction.click();
    await nextTick();
    direction.click();
    await nextTick();
    expect(node(view.root, "article").textContent).toContain("Person 0");
    select.value = "";
    select.dispatchEvent(new Event("change"));
    await nextTick();
    expect(direction.disabled).toBe(true);
  });
  it("renders native load-more as the explicit accessible fallback to an intersection observer", async () => {
    const view = mount({
      forceMobile: true,
      paginationMode: "infinite",
      defaults: { limit: 1 },
    });
    await nextTick();
    expect(view.root.querySelectorAll("article")).toHaveLength(1);
    node<HTMLButtonElement>(
      view.root,
      '[data-adapttable-part="load-more-button"]'
    ).click();
    await nextTick();
    expect(view.root.querySelectorAll("article")).toHaveLength(2);
  });
  it("passes typed replacement slots their actual error and empty clear action", async () => {
    const error = new Error("Unavailable");
    const retry = vi.fn();
    let seenError: Error | undefined;
    let seenEmpty = false;
    const view = mount(
      { data: [], isLoading: true },
      {},
      {
        loading: () => h("p", { "data-testid": "custom-loading" }, "Working"),
        empty: (state: { noResults: boolean; clear: () => void }) => {
          seenEmpty = state.noResults;
          return h(
            "button",
            { "data-testid": "custom-empty", onClick: state.clear },
            "Reset"
          );
        },
        error: (state: { error: Error; retry?: () => void }) => {
          seenError = state.error;
          return h(
            "button",
            { "data-testid": "custom-retry", onClick: state.retry },
            state.error.message
          );
        },
      }
    );
    expect(
      view.root.querySelector('[data-testid="custom-loading"]')
    ).not.toBeNull();
    view.props.value = { ...view.props.value, isLoading: false };
    await nextTick();
    expect(
      view.root.querySelector('[data-testid="custom-empty"]')
    ).not.toBeNull();
    expect(seenEmpty).toBe(false);
    view.props.value = { ...view.props.value, error, refetch: retry };
    await nextTick();
    expect(seenError).toBe(error);
    node<HTMLButtonElement>(view.root, '[data-testid="custom-retry"]').click();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
