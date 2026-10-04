import type { ColumnLayoutState } from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
} from "vue";
import { renderToString } from "vue/server-renderer";

import { type ColumnInput, DataTable, type DataTableProps } from "../src";

interface Person {
  id: string;
  name: string;
  age: number;
}
const data: readonly Person[] = [{ id: "ada", name: "Ada", age: 36 }];
const columns: readonly ColumnInput<Person>[] = [
  {
    header: "Person",
    collapsedKey: "name",
    children: [{ key: "name" }, { key: "age" }],
  },
];
const releases: (() => void)[] = [];
afterEach(() => releases.splice(0).forEach((release) => release()));
function mount(
  initial: Partial<DataTableProps<Person>> = {},
  update = vi.fn<(next: ColumnLayoutState) => void>()
) {
  const props = shallowRef<DataTableProps<Person>>({
    data,
    columns,
    rowKey: (row) => row.id,
    urlSync: false,
    collapsibleColumnGroups: true,
    ...initial,
  });
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(DataTable<Person>, {
          ...props.value,
          "onUpdate:columnLayout": update,
        }),
    })
  );
  releases.push(() => {
    app.unmount();
    root.remove();
  });
  app.mount(root);
  return { root, props, update };
}
function button(root: HTMLElement): HTMLButtonElement {
  const node = root.querySelector<HTMLButtonElement>(
    '[data-adapttable-part="column-group-toggle"]'
  );
  if (!node) throw new Error("Missing native column-group toggle");
  return node;
}
const layout: ColumnLayoutState = {
  hidden: [],
  order: [],
  widths: {},
  pinned: {},
  collapsedGroups: [],
};

describe("native collapsible column groups", () => {
  it("supplies the required native toggle and preserves semantic attrs and classNames", async () => {
    const view = mount({
      classNames: {
        columnGroup: "group-heading",
        columnGroupToggle: "group-toggle",
      },
    });
    const toggle = button(view.root);
    expect(toggle.type).toBe("button");
    expect(toggle.tabIndex).toBe(0);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe(
      "Collapse column group: Person"
    );
    expect(toggle.title).toBe("Collapse column group: Person");
    expect(toggle.className).toBe("group-toggle");
    expect(toggle.parentElement?.getAttribute("scope")).toBe("colgroup");
    expect(toggle.parentElement?.getAttribute("role")).toBe("columnheader");
    expect(toggle.parentElement?.className).toBe("group-heading");
    expect(view.root.querySelectorAll("tbody td")).toHaveLength(2);
    toggle.click();
    await nextTick();
    expect(button(view.root).getAttribute("aria-expanded")).toBe("false");
    expect(button(view.root).getAttribute("aria-label")).toBe(
      "Expand column group: Person"
    );
    expect(view.root.querySelectorAll("tbody td")).toHaveLength(1);
    expect(view.root.querySelector("tbody")?.textContent).toBe("Ada");
    button(view.root).click();
    await nextTick();
    expect(view.root.querySelectorAll("tbody td")).toHaveLength(2);
    expect(view.update).toHaveBeenCalledTimes(2);
    expect(
      view.update.mock.calls.map(([next]) => next.collapsedGroups)
    ).toEqual([["Person"], undefined]);
  });

  it("uses localized actions and leaves Enter/Space default activation to the native button in RTL", async () => {
    const view = mount({
      dir: "rtl",
      labels: {
        collapseColumnGroup: "طي الأعمدة",
        expandColumnGroup: "توسيع الأعمدة",
      },
    });
    for (const key of ["Enter", " "]) {
      const toggle = button(view.root);
      toggle.focus();
      expect(document.activeElement).toBe(toggle);
      const keyboard = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      toggle.dispatchEvent(keyboard);
      expect(keyboard.defaultPrevented).toBe(false);
      // The native browser activation produces one detail-zero click; the kit
      // must not additionally mutate state in its keydown listener.
      toggle.dispatchEvent(
        new MouseEvent("click", { bubbles: true, detail: 0 })
      );
      await nextTick();
    }
    expect(view.update).toHaveBeenCalledTimes(2);
    expect(button(view.root).getAttribute("aria-label")).toBe(
      "طي الأعمدة: Person"
    );
    expect(view.root.firstElementChild?.getAttribute("dir")).toBe("rtl");
    button(view.root).click();
    await nextTick();
    expect(button(view.root).getAttribute("aria-label")).toBe(
      "توسيع الأعمدة: Person"
    );
  });

  it("keeps controlled collapse authoritative when a request is rejected or accepted", async () => {
    const view = mount({ columnLayout: layout });
    button(view.root).click();
    await nextTick();
    expect(view.update).toHaveBeenCalledTimes(1);
    expect(view.update.mock.calls[0]?.[0].collapsedGroups).toEqual(["Person"]);
    expect(button(view.root).getAttribute("aria-expanded")).toBe("true");
    expect(view.root.querySelectorAll("tbody td")).toHaveLength(2);
    view.props.value = {
      ...view.props.value,
      columnLayout: { ...layout, collapsedGroups: ["Person"] },
    };
    await nextTick();
    expect(button(view.root).getAttribute("aria-expanded")).toBe("false");
    expect(view.root.querySelectorAll("tbody td")).toHaveLength(1);
    expect(view.update).toHaveBeenCalledTimes(1);
    button(view.root).click();
    await nextTick();
    expect(view.update.mock.calls[1]?.[0].collapsedGroups).toBeUndefined();
    expect(button(view.root).getAttribute("aria-expanded")).toBe("false");
  });

  it("seeds default collapse once and renders no toggle when collapse is disabled", async () => {
    const view = mount({
      defaultColumnLayout: { collapsedGroups: ["Person"] },
    });
    expect(button(view.root).getAttribute("aria-expanded")).toBe("false");
    button(view.root).click();
    await nextTick();
    view.props.value = {
      ...view.props.value,
      defaultColumnLayout: { collapsedGroups: ["Person"] },
    };
    await nextTick();
    expect(button(view.root).getAttribute("aria-expanded")).toBe("true");
    view.props.value = { ...view.props.value, collapsibleColumnGroups: false };
    await nextTick();
    expect(
      view.root.querySelector('[data-adapttable-part="column-group-toggle"]')
    ).toBeNull();
    expect(view.root.querySelectorAll("tbody td")).toHaveLength(2);
  });
});

describe("column group host updates and hydration", () => {
  it("accepts one parent update and never emits from prop reconciliation", async () => {
    const update = vi.fn((next: ColumnLayoutState) => {
      view.props.value = { ...view.props.value, columnLayout: next };
    });
    const view = mount({ columnLayout: layout }, update);
    expect(update).not.toHaveBeenCalled();
    button(view.root).click();
    await nextTick();
    expect(update).toHaveBeenCalledTimes(1);
    expect(button(view.root).getAttribute("aria-expanded")).toBe("false");
    view.props.value = {
      ...view.props.value,
      data: [{ id: "grace", name: "Grace", age: 40 }],
    };
    await nextTick();
    expect(view.root.querySelector("tbody")?.textContent).toBe("Grace");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("keeps cards in the shared controlled layout without rendering desktop group buttons", async () => {
    const view = mount({
      forceMobile: true,
      columnLayout: { ...layout, collapsedGroups: ["Person"] },
    });
    expect(view.root.querySelector("table")).toBeNull();
    expect(
      view.root.querySelector('[data-adapttable-part="column-group-toggle"]')
    ).toBeNull();
    expect(view.root.querySelectorAll("dd")).toHaveLength(1);
    view.props.value = { ...view.props.value, columnLayout: layout };
    await nextTick();
    expect(view.root.querySelectorAll("dd")).toHaveLength(2);
    expect(view.update).not.toHaveBeenCalled();
  });

  it("hydrates a collapsed group without mismatch and its native toggle remains interactive", async () => {
    const update = vi.fn();
    const component = defineComponent({
      render: () =>
        h(DataTable<Person>, {
          data,
          columns,
          rowKey: (row) => row.id,
          urlSync: false,
          collapsibleColumnGroups: true,
          defaultColumnLayout: { collapsedGroups: ["Person"] },
          "onUpdate:columnLayout": update,
        }),
    });
    const root = document.createElement("div");
    root.innerHTML = await renderToString(createSSRApp(component));
    document.body.append(root);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const app = createSSRApp(component);
    releases.push(() => {
      app.unmount();
      root.remove();
      warn.mockRestore();
      error.mockRestore();
    });
    app.mount(root);
    await nextTick();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(button(root).getAttribute("aria-expanded")).toBe("false");
    button(root).click();
    await nextTick();
    expect(root.querySelectorAll("tbody td")).toHaveLength(2);
    expect(button(root).getAttribute("aria-expanded")).toBe("true");
    expect(update).toHaveBeenCalledTimes(1);
  });
});
