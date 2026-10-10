import type { ColumnLayoutState } from "@adapttable/vue";
import type { DataTableProps } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h, KeepAlive, nextTick, ref, shallowRef } from "vue";

import { columnMenu } from "../src/column-menu";
import DataTable from "../src/DataTable.vue";
import { mount, node } from "./mount";
import ColumnMenuConsumer from "./types/ColumnMenuConsumer.vue";
interface Row {
  id: string;
  name: string;
  score: number;
}
const data: Row[] = [
  { id: "a", name: "Ada", score: 10 },
  { id: "b", name: "Grace", score: 30 },
];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const layout: ColumnLayoutState = {
  hidden: [],
  order: [],
  widths: {},
  pinned: {},
  collapsedGroups: [],
};
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
function fixture(extra: Partial<DataTableProps<Row>> = {}) {
  const props = shallowRef<DataTableProps<Row>>({
    data,
    columns: [
      { key: "name", header: "Name", renameable: true, sortable: true },
      { key: "score", header: "Score", sortable: true },
    ],
    rowKey: (row) => row.id,
    forceMobile: false,
    urlSync: false,
    searchable: false,
    features: [columnMenu()],
    ...extra,
  });
  const changed = vi.fn<(value: ColumnLayoutState) => void>();
  return {
    ...mount(() =>
      h(DataTable<Row>, { ...props.value, "onUpdate:columnLayout": changed })
    ),
    props,
    changed,
  };
}
async function open(root: ParentNode) {
  const trigger = node<HTMLButtonElement>(root, part("column-menu-button"));
  trigger.focus();
  trigger.click();
  await tick();
  const panel = node<HTMLElement>(document, part("column-menu-panel"));
  await vi.waitFor(() =>
    expect(document.activeElement).toBe(node(panel, part("column-menu-search")))
  );
  return { trigger, panel };
}
function row(panel: ParentNode, label: string) {
  const found = [
    ...panel.querySelectorAll<HTMLElement>(part("column-menu-item")),
  ].find(
    (item) =>
      item.querySelector(part("column-menu-label"))?.textContent === label
  );
  if (!found) throw new Error(`Missing menu row ${label}`);
  return found;
}
async function key(element: HTMLElement, key: string) {
  element.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
  await tick();
}
async function type(input: HTMLInputElement, text: string) {
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
describe("Element Plus Columns and rename controls", () => {
  for (const dir of ["ltr", "rtl"] as const) {
    it(`requests controlled pinning exactly once and preserves rejected layout, dir=${dir}`, async () => {
      const view = fixture({ dir, columnLayout: layout });
      await tick();
      const { trigger, panel } = await open(view.root);
      expect(trigger.classList.contains("el-button")).toBe(true);
      expect(panel.classList.contains("el-card")).toBe(true);
      expect(panel.getAttribute("role")).toBe("dialog");
      expect(panel.getAttribute("dir")).toBe(dir);
      expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
      expect(view.root.contains(panel)).toBe(false);
      const pin = node<HTMLButtonElement>(
        row(panel, "Name"),
        part("column-menu-pin")
      );
      pin.click();
      await tick();
      expect(view.changed).toHaveBeenCalledTimes(1);
      const next = view.changed.mock.calls[0]?.[0];
      if (!next) throw new Error("Missing layout request");
      expect(next.pinned.name).toBe("start");
      expect(pin.getAttribute("aria-pressed")).toBe("false");
      expect(
        node(view.root, 'th[data-column-key="name"]').getAttribute(
          "data-pinned"
        )
      ).toBeNull();
      view.props.value = { ...view.props.value, columnLayout: next };
      await tick();
      expect(node(row(panel, "Name"), part("column-menu-pin"))).toBe(pin);
      expect(pin.getAttribute("aria-pressed")).toBe("true");
      expect(
        node(view.root, 'th[data-column-key="name"]').getAttribute(
          "data-pinned"
        )
      ).toBe("start");
      await key(node<HTMLElement>(panel, part("column-menu-search")), "Escape");
      await vi.waitFor(() =>
        expect(document.querySelector(part("column-menu-panel"))).toBeNull()
      );
      expect(document.activeElement).toBe(trigger);
    });
  }
  it("uses real search and visibility controls without closing the managed panel", async () => {
    const view = fixture();
    await tick();
    const { panel } = await open(view.root);
    const search = node<HTMLInputElement>(panel, part("column-menu-search"));
    await type(search, "Name");
    expect(panel.querySelectorAll(part("column-menu-item"))).toHaveLength(1);
    expect(document.activeElement).toBe(search);
    const hide = node<HTMLButtonElement>(
      row(panel, "Name"),
      part("column-menu-visibility")
    );
    hide.click();
    await tick();
    expect(view.root.querySelector('th[data-column-key="name"]')).toBeNull();
    expect(hide.getAttribute("aria-pressed")).toBe("false");
    hide.click();
    await tick();
    expect(
      view.root.querySelector('th[data-column-key="name"]')
    ).not.toBeNull();
    expect(document.querySelector(part("column-menu-panel"))).toBe(panel);
  });
  it("focuses the real direct-rename input, validates its error relationship and restores the trigger", async () => {
    const renamed = vi.fn();
    const view = fixture({ onColumnRename: renamed });
    await tick();
    const trigger = node<HTMLButtonElement>(
      view.root,
      part("header-rename-button")
    );
    trigger.focus();
    trigger.click();
    await tick();
    const input = node<HTMLInputElement>(
      view.root,
      part("header-rename-input")
    );
    expect(input.tagName).toBe("INPUT");
    expect(input.closest(".el-input")).not.toBeNull();
    expect(document.activeElement).toBe(input);
    expect(
      node<HTMLLabelElement>(view.root, part("header-rename-label")).control
    ).toBe(input);
    await type(input, "  ");
    await key(input, "Enter");
    expect(renamed).not.toHaveBeenCalled();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(
      node(view.root, part("header-rename-error")).id
    );
    await type(input, "Display name");
    await key(input, "Enter");
    expect(renamed).toHaveBeenCalledExactlyOnceWith("name", "Display name");
    expect(view.root.querySelector(part("header-rename-input"))).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(node(view.root, 'th[data-column-key="name"]').textContent).toContain(
      "Display name"
    );
  });
  it("keeps controlled names unchanged until the host accepts the exact rename request", async () => {
    const renamed = vi.fn();
    const view = fixture({ columnLayout: layout, onColumnRename: renamed });
    await tick();
    const trigger = node<HTMLButtonElement>(
      view.root,
      part("header-rename-button")
    );
    trigger.focus();
    trigger.click();
    await tick();
    const input = node<HTMLInputElement>(
      view.root,
      part("header-rename-input")
    );
    await type(input, "  Person  ");
    await key(input, "Enter");
    expect(renamed).toHaveBeenCalledExactlyOnceWith("name", "Person");
    expect(view.changed).toHaveBeenCalledTimes(1);
    expect(node(view.root, 'th[data-column-key="name"]').textContent).toContain(
      "Name"
    );
    expect(document.activeElement).toBe(trigger);
    const next = view.changed.mock.calls[0]?.[0];
    if (!next) throw new Error("Missing rename layout request");
    expect(next.names?.name).toBe("Person");
    view.props.value = { ...view.props.value, columnLayout: next };
    await tick();
    expect(node(view.root, 'th[data-column-key="name"]').textContent).toContain(
      "Person"
    );
  });
  for (const mobile of [false, true]) {
    it(`retires the open portal and stale requests through cache and disposal, mobile=${mobile}`, async () => {
      const active = ref(true);
      const changed = vi.fn();
      const view = mount(() =>
        h(KeepAlive, null, {
          default: () =>
            active.value
              ? h(DataTable<Row>, {
                  data,
                  columns: [
                    { key: "name", header: "Name" },
                    { key: "score", header: "Score" },
                  ],
                  rowKey: (row) => row.id,
                  forceMobile: mobile,
                  urlSync: false,
                  searchable: false,
                  columnLayout: layout,
                  features: [columnMenu()],
                  "onUpdate:columnLayout": changed,
                })
              : h("span"),
        })
      );
      await tick();
      const { trigger, panel } = await open(view.root);
      const pin = node<HTMLButtonElement>(
        row(panel, "Name"),
        part("column-menu-pin")
      );
      active.value = false;
      await tick();
      expect(document.querySelector(part("column-menu-panel"))).toBeNull();
      expect(panel.isConnected).toBe(false);
      pin.click();
      await tick();
      expect(changed).not.toHaveBeenCalled();
      active.value = true;
      await tick();
      expect(node(view.root, part("column-menu-button"))).toBe(trigger);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      const reopened = await open(view.root);
      expect(reopened.panel).not.toBe(panel);
      view.unmount();
      await tick();
      expect(document.querySelector(part("column-menu-panel"))).toBeNull();
      pin.click();
      expect(changed).not.toHaveBeenCalled();
    });
  }
  it("changes direction on the same open panel without changing its query or trigger", async () => {
    const view = fixture({ dir: "rtl" });
    await tick();
    const { trigger, panel } = await open(view.root);
    const search = node<HTMLInputElement>(panel, part("column-menu-search"));
    await type(search, "Name");
    for (const dir of ["ltr", "rtl"] as const) {
      view.props.value = { ...view.props.value, dir };
      await tick();
      expect(document.querySelector(part("column-menu-panel"))).toBe(panel);
      expect(panel.getAttribute("dir")).toBe(dir);
      expect(node(view.root, part("column-menu-button"))).toBe(trigger);
      expect(node(panel, part("column-menu-search"))).toBe(search);
      expect(search.value).toBe("Name");
      expect(document.activeElement).toBe(search);
    }
    expect(view.changed).not.toHaveBeenCalled();
  });
  it("dismisses outside without stealing focus and ignores the retired pin button", async () => {
    const view = fixture({ columnLayout: layout });
    await tick();
    const { panel } = await open(view.root);
    const pin = node<HTMLButtonElement>(
      row(panel, "Name"),
      part("column-menu-pin")
    );
    const outside = document.createElement("button");
    document.body.append(outside);
    try {
      outside.focus();
      outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      outside.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      await tick();
      expect(document.querySelector(part("column-menu-panel"))).toBeNull();
      expect(document.activeElement).toBe(outside);
      pin.click();
      await tick();
      expect(view.changed).not.toHaveBeenCalled();
    } finally {
      outside.remove();
    }
  });
  it("preserves bare Boolean edge flags in a real generic SFC consumer", async () => {
    const { root } = mount(() => h(ColumnMenuConsumer));
    await tick();
    const triggers = root.querySelectorAll<HTMLButtonElement>(
      part("column-menu-button")
    );
    expect(triggers).toHaveLength(2);
    const trigger = triggers[1];
    if (!trigger) throw new Error("Missing standalone Columns trigger");
    trigger.click();
    await tick();
    const panel = node<HTMLElement>(document, part("column-menu-panel"));
    expect(
      panel.querySelector(`${part("column-menu-item")}[data-actions]`)
    ).not.toBeNull();
    expect(
      panel.querySelector(`${part("column-menu-item")}[data-reorder]`)
    ).not.toBeNull();
  });
});
