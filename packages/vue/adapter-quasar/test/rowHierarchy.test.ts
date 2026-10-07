import { mount } from "@vue/test-utils";
import { QBtn, QCard, QMenu, QSpinner, Quasar } from "quasar";
import { afterEach, expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { cellSpan } from "../src/cell-span";
import { collapsibleColumnGroups } from "../src/column-groups";
import { extraRows } from "../src/extra-rows";
import { fitColumns } from "../src/fit-columns";
import { multiSort } from "../src/multi-sort";
import { pinnedSummaryRows } from "../src/pinned-summary-rows";
import { resizableColumns } from "../src/resizable-columns";
import { rowActions } from "../src/row-actions";
import { rowAppearance } from "../src/row-appearance";
import { rowDetail } from "../src/row-detail";
import { rowPinning } from "../src/row-pinning";
import { tree } from "../src/tree";
import { virtualize } from "../src/virtualize";
import {
  hierarchyColumns,
  type HierarchyRow,
  hierarchyRows,
} from "./rowHierarchyFixture";

const wrappers: ReturnType<typeof mount>[] = [];
const settle = async () => {
  await nextTick();
  await nextTick();
};
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await settle();
});
const common = {
  data: hierarchyRows,
  columns: hierarchyColumns,
  rowKey: (row: HierarchyRow) => row.id,
  urlSync: false,
  searchable: false,
};
const native = { attachTo: document.body, global: { plugins: [Quasar] } };
const part = (name: string) => `[data-adapttable-part="${name}"]`;

it.each([false, true])(
  "requests controlled hierarchy changes through genuine Quasar buttons, mobile=%s",
  async (mobile) => {
    const expanded = shallowRef<readonly string[]>([]);
    const details = shallowRef<readonly string[]>([]);
    const onTree = vi.fn();
    const onDetail = vi.fn();
    const features = [
      tree<HierarchyRow>({
        getChildren: (row) => row.children,
        expandedIds: expanded,
        onExpandedIdsChange: onTree,
      }),
      rowDetail<HierarchyRow>((row) => h("p", `Panel ${row.name}`), undefined, {
        expandedRowIds: details,
        onExpandedRowIdsChange: onDetail,
      }),
    ];
    const wrapper = mount(DataTable<HierarchyRow>, {
      ...native,
      props: { ...common, forceMobile: mobile, dir: "rtl", features },
    });
    wrappers.push(wrapper);
    await settle();
    expect(wrapper.findAllComponents(QBtn).length).toBeGreaterThan(0);
    const treeButton = wrapper.get(part("tree-toggle"));
    const detailButton = wrapper.findAll(part("expand-button"))[0];
    expect(detailButton).toBeDefined();
    const originalTree = treeButton.element;
    await treeButton.trigger("keydown", { key: "ArrowLeft" });
    expect(onTree).toHaveBeenCalledExactlyOnceWith(["a"]);
    expect(treeButton.attributes("aria-expanded")).toBe("false");
    expect(wrapper.text()).not.toContain("Child");
    await detailButton?.trigger("click");
    expect(onDetail).toHaveBeenCalledExactlyOnceWith(["a"]);
    expect(wrapper.text()).not.toContain("Panel Ada");
    expanded.value = ["a"];
    details.value = ["a"];
    await settle();
    expect(wrapper.get(part("tree-toggle")).element).toBe(originalTree);
    expect(wrapper.text()).toContain("Child");
    expect(wrapper.text()).toContain("Panel Ada");
    expect(wrapper.find('[aria-level="2"]').exists()).toBe(true);
    if (mobile)
      expect(wrapper.findAllComponents(QCard).length).toBeGreaterThan(1);
    await wrapper
      .get(part("tree-toggle"))
      .trigger("keydown", { key: "ArrowRight" });
    expect(onTree).toHaveBeenLastCalledWith([]);
    expect(hierarchyRows[0]?.children?.[0]?.name).toBe("Child");
  }
);

it("requests lazy children from the host and keeps loading in a native spinner", async () => {
  const data = shallowRef<readonly HierarchyRow[]>([
    { id: "a", name: "Ada", score: 1 },
  ]);
  let complete: (() => void) | undefined;
  const loaded = new Promise<void>((resolve) => {
    complete = resolve;
  });
  const onLoad = vi.fn(() => loaded);
  const feature = tree<HierarchyRow>({
    getChildren: (row) => row.children,
    hasChildren: (row) => row.id === "a",
    onLoadChildren: onLoad,
  });
  const wrapper = mount(
    defineComponent(
      () => () =>
        h(DataTable<HierarchyRow>, {
          ...common,
          data: data.value,
          features: [feature],
        })
    ),
    native
  );
  wrappers.push(wrapper);
  await settle();
  await wrapper.get(part("tree-toggle")).trigger("click");
  expect(onLoad).toHaveBeenCalledExactlyOnceWith(data.value[0]);
  expect(wrapper.findComponent(QSpinner).exists()).toBe(true);
  expect(wrapper.get(part("tree-toggle")).attributes("aria-busy")).toBe("true");
  expect(data.value[0]?.children).toBeUndefined();
  data.value = hierarchyRows;
  complete?.();
  await loaded;
  await settle();
  expect(wrapper.text()).toContain("Child");
  expect(wrapper.findComponent(QSpinner).exists()).toBe(false);
});

it("ignores a late confirmation after the row action scope is disposed", async () => {
  let complete: ((approved: boolean) => void) | undefined;
  const pending = new Promise<boolean>((resolve) => {
    complete = resolve;
  });
  const confirm = vi.fn(() => pending);
  const invoke = vi.fn();
  const wrapper = mount(DataTable<HierarchyRow>, {
    ...native,
    props: {
      ...common,
      confirm,
      features: [
        rowActions<HierarchyRow>([
          {
            key: "remove",
            label: "Remove record",
            onClick: invoke,
            confirm: {
              title: "Remove record",
              message: (row) => row.name,
              confirmLabel: "Remove",
            },
          },
        ]),
      ],
    },
  });
  wrappers.push(wrapper);
  await settle();
  await wrapper.get(part("action-button")).trigger("click");
  expect(confirm).toHaveBeenCalledTimes(1);
  wrapper.unmount();
  wrappers.pop();
  complete?.(true);
  await pending;
  await settle();
  expect(invoke).not.toHaveBeenCalled();
});

it.each([false, true])(
  "keeps writes host owned and controlled row pins authoritative, mobile=%s",
  async (mobile) => {
    const data = shallowRef(hierarchyRows);
    const pins = shallowRef({ top: [] as string[], bottom: [] as string[] });
    const onPins = vi.fn();
    const onDelete = vi.fn();
    const onDuplicate = vi.fn();
    const onOpen = vi.fn();
    const features = [
      rowActions<HierarchyRow>(
        [{ key: "open", label: "Open", onClick: onOpen }],
        {
          onDeleteRow: onDelete,
          onDuplicateRow: onDuplicate,
          confirmDeleteRow: false,
        }
      ),
      rowPinning({ pinnedRowIds: pins, onPinnedRowIdsChange: onPins }),
    ];
    const wrapper = mount(
      defineComponent(
        () => () =>
          h(DataTable<HierarchyRow>, {
            ...common,
            data: data.value,
            forceMobile: mobile,
            labels: { duplicateRow: "Duplicate", deleteRow: "Delete" },
            features,
          })
      ),
      native
    );
    wrappers.push(wrapper);
    await settle();
    const action = (label: string) =>
      wrapper
        .findAll(part("action-button"))
        .find((button) => button.attributes("aria-label") === label);
    await action("Open")?.trigger("click");
    await action("Duplicate")?.trigger("click");
    await action("Delete")?.trigger("click");
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(hierarchyRows[0]);
    expect(onDuplicate).toHaveBeenCalledExactlyOnceWith(hierarchyRows[0]);
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(hierarchyRows[0]);
    expect(data.value).toBe(hierarchyRows);
    expect(wrapper.text()).toContain("Ada");
    const pin = wrapper
      .findAll(part("action-button"))
      .find((button) =>
        /pin.*top/i.test(button.attributes("aria-label") ?? "")
      );
    expect(pin).toBeDefined();
    await pin?.trigger("click");
    expect(onPins).toHaveBeenCalledExactlyOnceWith({ top: ["a"], bottom: [] });
    expect(wrapper.find(part("pinned-top")).exists()).toBe(false);
    pins.value = { top: ["a"], bottom: [] };
    await settle();
    expect(wrapper.get(part("pinned-top")).text()).toContain("Ada");
    data.value = hierarchyRows.slice(1);
    await settle();
    expect(wrapper.text()).not.toContain("Ada");
  }
);

it("retires captured hierarchy and row actions during KeepAlive and on unmount", async () => {
  const visible = shallowRef(true);
  const treeRequest = vi.fn();
  const detailRequest = vi.fn();
  const actionRequest = vi.fn();
  const features = [
    tree<HierarchyRow>({
      getChildren: (row) => row.children,
      expandedIds: [],
      onExpandedIdsChange: treeRequest,
    }),
    rowDetail<HierarchyRow>((row) => row.name, undefined, {
      expandedRowIds: [],
      onExpandedRowIdsChange: detailRequest,
    }),
    rowActions<HierarchyRow>([
      { key: "open", label: "Open", onClick: actionRequest },
    ]),
  ];
  const Child = defineComponent(
    () => () => h(DataTable<HierarchyRow>, { ...common, features })
  );
  const wrapper = mount(
    defineComponent(
      () => () =>
        h(KeepAlive, null, { default: () => (visible.value ? h(Child) : null) })
    ),
    native
  );
  wrappers.push(wrapper);
  await settle();
  const elements = ["tree-toggle", "expand-button", "action-button"].map(
    (name) => wrapper.get(part(name)).element as HTMLButtonElement
  );
  visible.value = false;
  await settle();
  elements.forEach((element) => element.click());
  expect(treeRequest).not.toHaveBeenCalled();
  expect(detailRequest).not.toHaveBeenCalled();
  expect(actionRequest).not.toHaveBeenCalled();
  visible.value = true;
  await settle();
  elements.forEach((element) => element.click());
  expect(treeRequest).toHaveBeenCalledTimes(1);
  expect(detailRequest).toHaveBeenCalledTimes(1);
  await wrapper.get(part("action-button")).trigger("click");
  expect(actionRequest).toHaveBeenCalledTimes(1);
  wrapper.unmount();
  wrappers.pop();
  elements.forEach((element) => element.click());
  expect(treeRequest).toHaveBeenCalledTimes(1);
  expect(detailRequest).toHaveBeenCalledTimes(1);
  expect(actionRequest).toHaveBeenCalledTimes(1);
});

it.each([false, true])(
  "renders summaries, injected rows and host appearance without mutating rows, mobile=%s",
  async (mobile) => {
    const before = JSON.stringify(hierarchyRows);
    const wrapper = mount(DataTable<HierarchyRow>, {
      ...native,
      props: {
        ...common,
        forceMobile: mobile,
        selectable: true,
        features: [
          pinnedSummaryRows<HierarchyRow>({
            top: [{ id: "total", name: "Total", score: 3 }],
          }),
          extraRows([
            {
              key: "note",
              kind: "fullWidth",
              beforeRowId: "b",
              render: () => h("p", "Host note"),
            },
            { key: "separator", kind: "separator" },
          ]),
          rowAppearance<HierarchyRow>({
            rowClassName: (row) => `row-${row.id}`,
            rowStyle: () => ({ backgroundColor: "pink" }),
            rowHeight: 48,
          }),
          cellSpan<HierarchyRow>(({ row, column }) =>
            row.id === "a" && column.key === "name" ? { colSpan: 2 } : undefined
          ),
          virtualize(false),
        ],
      },
    });
    wrappers.push(wrapper);
    await settle();
    expect(wrapper.get(part("pinned-summary-top")).text()).toContain("Total");
    expect(
      wrapper.get(part("pinned-summary-top")).find(part("checkbox")).exists()
    ).toBe(false);
    expect(wrapper.text()).toContain("Host note");
    expect(wrapper.get(".row-a").attributes("style")).toContain("height: 48px");
    expect(wrapper.get(".row-a").attributes("style")).toContain(
      "background-color: pink"
    );
    if (!mobile)
      expect(wrapper.get(".row-a [colspan='2']").text()).toContain("Ada");
    expect(JSON.stringify(hierarchyRows)).toBe(before);
  }
);

it("uses a genuine Quasar menu for per-row actions and closes on invocation", async () => {
  const onOpen = vi.fn();
  const wrapper = mount(DataTable<HierarchyRow>, {
    ...native,
    props: {
      ...common,
      rowActionsLayout: "menu",
      features: [
        rowActions<HierarchyRow>([
          { key: "open", label: "Open", onClick: onOpen },
        ]),
      ],
    },
  });
  wrappers.push(wrapper);
  await settle();
  expect(wrapper.findComponent(QMenu).exists()).toBe(true);
  await wrapper.findAll(part("row-actions-trigger"))[0]?.trigger("click");
  await new Promise((resolve) => setTimeout(resolve, 40));
  const action = document.querySelector<HTMLButtonElement>(
    `${part("row-actions-menu")} ${part("action-button")}`
  );
  expect(action?.classList.contains("q-btn")).toBe(true);
  action?.click();
  await settle();
  expect(onOpen).toHaveBeenCalledExactlyOnceWith(hierarchyRows[0]);
  expect(
    wrapper.findAll(part("row-actions-trigger"))[0]?.attributes("aria-expanded")
  ).toBe("false");
});

it("composes native column group and sort controls with resize handles", async () => {
  const wrapper = mount(DataTable<HierarchyRow>, {
    ...native,
    props: {
      ...common,
      forceMobile: false,
      columns: [
        { key: "profile", header: "Profile", children: hierarchyColumns },
      ],
      features: [
        collapsibleColumnGroups(),
        fitColumns(),
        multiSort(),
        resizableColumns(),
      ],
    },
  });
  wrappers.push(wrapper);
  await settle();
  const toggle = wrapper.get(part("column-group-toggle"));
  expect(toggle.element.classList.contains("q-btn")).toBe(true);
  expect(wrapper.findAll(part("resize-handle"))).toHaveLength(2);
  const sorts = wrapper.findAll(part("sort-button"));
  await sorts[0]?.trigger("click");
  await sorts[1]?.trigger("click", { shiftKey: true });
  expect(wrapper.findAll('[aria-sort="ascending"]')).toHaveLength(2);
  await toggle.trigger("click");
  expect(
    wrapper.get(part("column-group-toggle")).attributes("aria-expanded")
  ).toBe("false");
});

it.each([false, true])(
  "windows actual row targets while preserving pinned summaries, mobile=%s",
  async (mobile) => {
    const height = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetHeight"
    );
    const width = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "offsetWidth"
    );
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return 300;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return 800;
      },
    });
    const rows = Array.from({ length: 80 }, (_, index) => ({
      id: String(index),
      name: `Row ${index}`,
      score: index,
    }));
    try {
      const wrapper = mount(DataTable<HierarchyRow>, {
        ...native,
        props: {
          ...common,
          data: rows,
          forceMobile: mobile,
          paginationMode: "infinite",
          defaults: { limit: 100 },
          features: [
            virtualize({
              maxHeight: 300,
              estimateRowSize: 48,
              estimateCardSize: 100,
              virtualOverscan: 1,
            }),
            pinnedSummaryRows<HierarchyRow>({
              top: [{ id: "summary", name: "Total", score: 80 }],
            }),
          ],
        },
      });
      wrappers.push(wrapper);
      await settle();
      expect(wrapper.findAll(part("virtual-spacer"))).toHaveLength(2);
      expect(
        wrapper.findAll(part(mobile ? "card" : "row")).length
      ).toBeLessThan(80);
      expect(
        wrapper.findAll(part(mobile ? "card" : "row")).length
      ).toBeGreaterThan(0);
      expect(wrapper.get(part("pinned-summary-top")).text()).toContain("Total");
      expect(wrapper.get(part("scroll-box")).attributes("style")).toContain(
        "max-height: 300px"
      );
      expect(rows).toHaveLength(80);
      wrapper.unmount();
      wrappers.pop();
      await settle();
    } finally {
      if (height)
        Object.defineProperty(HTMLElement.prototype, "offsetHeight", height);
      else Reflect.deleteProperty(HTMLElement.prototype, "offsetHeight");
      if (width)
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", width);
      else Reflect.deleteProperty(HTMLElement.prototype, "offsetWidth");
    }
  }
);
