import { RowPairMeasureController } from "@adapttable/core/binding";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { rowDetail } from "../src/features/rowDetail";
import {
  DesktopTableChrome,
  MobileCardsChrome,
  type TableChromeSlots,
} from "../src/layout/tableChrome";
import { virtualize } from "../src/specialized/virtualize";
import { VirtualRowRefs } from "../src/specialized/virtualRowRefs";
import { useDataTableShell } from "../src/useDataTableShell";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("releases actual native row refs and observers after reorder, removal and layout replacement", async () => {
  const observers: Observer[] = [];
  class Observer {
    readonly nodes = new Set<Element>();
    constructor(readonly callback: ResizeObserverCallback) {
      observers.push(this);
    }
    observe(node: Element) {
      this.nodes.add(node);
    }
    unobserve(node: Element) {
      this.nodes.delete(node);
    }
    disconnect() {
      this.nodes.clear();
    }
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(240);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const height = this.dataset.adapttablePart === "detail-row" ? 100 : 48;
      return new DOMRect(0, 0, 400, height);
    }
  );
  const nativeNulls: string[] = [];
  const ref = VirtualRowRefs.prototype.ref;
  const wrappers = new WeakMap<
    ReturnType<typeof ref>,
    ReturnType<typeof ref>
  >();
  vi.spyOn(VirtualRowRefs.prototype, "ref").mockImplementation(function (
    this: VirtualRowRefs,
    ...args
  ) {
    const callback = ref.apply(this, args);
    let wrapped = wrappers.get(callback);
    if (!wrapped) {
      wrapped = (node) => {
        if (node === null) nativeNulls.push(args.join(":"));
        callback(node);
      };
      wrappers.set(callback, wrapped);
    }
    return wrapped;
  });
  const attach = vi.spyOn(RowPairMeasureController.prototype, "attach");
  const report = vi.spyOn(RowPairMeasureController.prototype, "report");
  const values = shallowRef(
    Array.from({ length: 30 }, (_, index) => ({ id: String(index) }))
  );
  const mobile = shallowRef(false);
  const controls: TableChromeSlots<{ id: string }> = {
    SortButton: ({ attrs, content }) => h("button", attrs, [content]),
    SelectionCheckbox: ({ attrs }) =>
      h("input", { ...attrs, type: "checkbox" }),
    RowDetailToggle: ({ attrs }) => h("button", attrs, "Details"),
  };
  const root = document.createElement("div");
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup() {
        const shell = useDataTableShell(() => ({
          data: values.value,
          columns: [{ key: "id" }],
          rowKey: (row: { id: string }) => row.id,
          forceMobile: mobile,
          defaults: { limit: 30 },
          paginationMode: "infinite",
          urlSync: false,
          features: [
            virtualize({ maxHeight: 240 }),
            rowDetail<{ id: string }>(() => h("p", "Panel"), ["0", "1"]),
          ],
        }));
        const surface = (node: unknown) => {
          if (node instanceof HTMLElement)
            shell.setSurface({
              rootElement: () => root,
              scrollElement: () => node,
            });
        };
        return () =>
          h("div", { ref: surface, "data-adapttable-part": "scroll-box" }, [
            mobile.value
              ? MobileCardsChrome({
                  model: shell.mobile.value,
                  slots: controls,
                })
              : DesktopTableChrome({
                  model: shell.desktop.value,
                  slots: controls,
                }),
          ]);
      },
    })
  );
  const settle = async () => {
    await nextTick();
    await nextTick();
  };
  app.mount(root);
  try {
    await settle();
    const firstRow = root.querySelector('[data-row-id="0"]')!;
    const secondRow = root.querySelector('[data-row-id="1"]')!;
    expect(firstRow, root.innerHTML).not.toBeNull();
    const firstDetail = firstRow.nextElementSibling!;
    expect(firstDetail.getAttribute("data-adapttable-part")).toBe("detail-row");
    const owner = observers.find((observer) => observer.nodes.has(firstRow))!;
    expect(owner).toBeDefined();
    expect(owner.nodes.has(firstDetail)).toBe(true);

    values.value = [
      values.value[1]!,
      values.value[0]!,
      ...values.value.slice(2),
    ];
    await settle();
    expect(root.querySelector('[data-row-id="0"]')).toBe(firstRow);
    expect(root.querySelector('[data-row-id="1"]')).toBe(secondRow);
    expect(firstRow.getAttribute("data-index")).toBe("1");
    expect(secondRow.getAttribute("data-index")).toBe("0");
    expect(owner.nodes.has(firstRow)).toBe(true);
    expect(owner.nodes.has(firstDetail)).toBe(true);

    nativeNulls.length = 0;
    attach.mockClear();
    values.value = values.value.filter((row) => row.id !== "0");
    await settle();
    expect(firstRow.isConnected).toBe(false);
    expect(firstDetail.isConnected).toBe(false);
    expect(nativeNulls).toContain("desktop:0:1:row");
    expect(nativeNulls).toContain("desktop:0:1:detail");
    expect(attach).toHaveBeenCalledWith(1, "row", null);
    expect(attach).toHaveBeenCalledWith(1, "detail", null);
    expect(owner.nodes.has(firstRow)).toBe(false);
    expect(owner.nodes.has(firstDetail)).toBe(false);
    report.mockClear();
    owner.callback(
      [firstRow, firstDetail].map(
        (target) => ({ target }) as ResizeObserverEntry
      ),
      owner
    );
    expect(report).not.toHaveBeenCalled();

    const desktopNodes = [...owner.nodes];
    expect(desktopNodes.length).toBeGreaterThan(0);
    nativeNulls.length = 0;
    mobile.value = true;
    await settle();
    expect(nativeNulls).toContain("desktop:1:0:row");
    expect(nativeNulls).toContain("desktop:1:0:detail");
    expect(desktopNodes.every((node) => !owner.nodes.has(node))).toBe(true);
    expect(owner.nodes.size).toBeGreaterThan(0);
    expect([...owner.nodes].every((node) => root.contains(node))).toBe(true);
    expect([...owner.nodes].some((node) => node.tagName === "TR")).toBe(false);
    report.mockClear();
    owner.callback(
      desktopNodes.map((target) => ({ target }) as ResizeObserverEntry),
      owner
    );
    expect(report).not.toHaveBeenCalled();
  } finally {
    app.unmount();
    root.remove();
  }
  expect(observers.every((observer) => observer.nodes.size === 0)).toBe(true);
});
