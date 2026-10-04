import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";

interface Row {
  id: string;
  name: string;
  score: number;
}
const rows: readonly Row[] = [
  { id: "ada", name: "Ada", score: 2 },
  { id: "grace", name: "Grace", score: 1 },
];
const releases: (() => void)[] = [];
afterEach(() => releases.splice(0).forEach((release) => release()));
function mount(initial: Partial<DataTableProps<Row>> = {}) {
  const props = shallowRef<DataTableProps<Row>>({
    data: rows,
    columns: [{ key: "name", sortable: true }, { key: "score" }],
    rowKey: (row) => row.id,
    urlSync: false,
    paginationMode: "paged",
    ...initial,
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({ render: () => h(DataTable<Row>, { ...props.value }) })
  );
  app.mount(root);
  releases.push(() => {
    app.unmount();
    root.remove();
  });
  return { root, props };
}
function part(
  root: ParentNode,
  name: string,
  tag: string,
  className?: string
): HTMLElement {
  const node = root.querySelector<HTMLElement>(
    `[data-adapttable-part="${name}"]`
  );
  if (!node) throw new Error(`Missing ${name}`);
  expect(node.tagName).toBe(tag);
  if (className) expect(node.classList.contains(className)).toBe(true);
  return node;
}

describe("native canonical semantic parts", () => {
  it("places search, selection and scroll parts on the real native elements while retaining classNames keys", () => {
    const view = mount({
      selectable: true,
      classNames: {
        searchWrapper: "search-field-class",
        searchInput: "search-class",
        selectionCheckbox: "checkbox-class",
        scroll: "scroll-class",
      },
    });
    const field = part(
      view.root,
      "search-field",
      "LABEL",
      "search-field-class"
    );
    expect(
      field.contains(part(view.root, "search", "INPUT", "search-class"))
    ).toBe(true);
    const scroll = part(view.root, "scroll-box", "DIV", "scroll-class");
    expect(scroll.tabIndex).toBe(-1);
    const table = part(view.root, "table", "TABLE");
    expect(table.getAttribute("aria-colcount")).toBeNull();
    expect(table.querySelector("tbody tr")?.children).toHaveLength(3);
    const checkbox = part(view.root, "checkbox", "INPUT", "checkbox-class");
    expect(checkbox.getAttribute("type")).toBe("checkbox");
    expect(
      view.root.querySelectorAll('input[data-adapttable-part="checkbox"]')
    ).toHaveLength(3);
    expect(
      view.root.querySelector(
        '[data-adapttable-part="search-wrapper"], [data-adapttable-part="selection-checkbox"], [data-adapttable-part="scroll"]'
      )
    ).toBeNull();
  });

  it("places loading, refresh and retry parts on their status and button targets", async () => {
    const retry = vi.fn();
    const view = mount({
      data: [],
      isLoading: true,
      classNames: {
        loading: "loading-class",
        refreshing: "refresh-class",
        retry: "retry-class",
      },
    });
    expect(
      part(view.root, "loading", "DIV", "loading-class").getAttribute("role")
    ).toBe("status");
    expect(part(view.root, "scroll-box", "DIV").getAttribute("aria-busy")).toBe(
      "true"
    );
    view.props.value = {
      ...view.props.value,
      data: rows,
      isLoading: false,
      isFetching: true,
      error: new Error("offline"),
      refetch: retry,
    };
    await nextTick();
    expect(
      part(view.root, "refresh-indicator", "DIV", "refresh-class").getAttribute(
        "role"
      )
    ).toBe("status");
    expect(view.root.querySelector("tbody")?.textContent).toContain("Ada");
    const button = part(view.root, "retry-button", "BUTTON", "retry-class");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.hasAttribute("disabled")).toBe(true);
    view.props.value = { ...view.props.value, isFetching: false };
    await nextTick();
    button.click();
    expect(retry).toHaveBeenCalledTimes(1);
    expect(
      view.root.querySelector(
        '[data-adapttable-part="retry"], [data-adapttable-part="refreshing"]'
      )
    ).toBeNull();
  });

  it("keeps load-more on its sentinel wrapper and load-more-button on its real action", async () => {
    const view = mount({
      paginationMode: "infinite",
      defaults: { limit: 1 },
      classNames: {
        loadMore: "sentinel-class",
        loadMoreButton: "load-button-class",
      },
    });
    const wrapper = part(view.root, "load-more", "DIV", "sentinel-class");
    const button = part(
      wrapper,
      "load-more-button",
      "BUTTON",
      "load-button-class"
    );
    expect(wrapper.children).toHaveLength(1);
    expect(button.getAttribute("type")).toBe("button");
    expect(view.root.querySelectorAll("tbody tr")).toHaveLength(1);
    button.click();
    await nextTick();
    expect(view.root.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(
      view.root.querySelector('[data-adapttable-part="load-more"]')
    ).toBeNull();
  });

  it("keeps mobile selection and card parts on the semantic card elements", () => {
    const view = mount({
      forceMobile: true,
      selectable: true,
      classNames: {
        cards: "cards-class",
        card: "card-class",
        cardFields: "fields-class",
        cardRow: "card-row-class",
        cardLabel: "label-class",
        cardValue: "value-class",
        selectionCheckbox: "checkbox-class",
      },
    });
    expect(view.root.querySelector("table")).toBeNull();
    expect(
      part(view.root, "cards", "DIV", "cards-class").getAttribute("role")
    ).toBe("list");
    const card = part(view.root, "card", "ARTICLE", "card-class");
    expect(card.getAttribute("role")).toBe("listitem");
    part(card, "checkbox", "INPUT", "checkbox-class");
    const fields = part(card, "card-fields", "DL", "fields-class");
    const row = part(fields, "card-row", "DIV", "card-row-class");
    expect(row.children).toHaveLength(2);
    part(row, "card-label", "DT", "label-class");
    part(row, "card-value", "DD", "value-class");
  });
});
