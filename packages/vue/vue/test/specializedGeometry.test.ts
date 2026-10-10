import type * as VirtualCore from "@tanstack/virtual-core";
import type { VirtualizerOptions } from "@tanstack/virtual-core";
import { afterEach, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";
const captured = vi.hoisted(() => ({
  instances: [] as { options: { scrollMargin?: number } }[],
}));
vi.mock("@tanstack/virtual-core", async (load) => {
  const actual = await load<typeof VirtualCore>();
  return {
    ...actual,
    Virtualizer: class extends actual.Virtualizer<Element | Window, Element> {
      constructor(options: VirtualizerOptions<Element | Window, Element>) {
        super(options);
        captured.instances.push(this);
      }
    },
  };
});
import { virtualize } from "../src/specialized/virtualize";
import { useDataTableShell } from "../src/useDataTableShell";
afterEach(() => {
  vi.restoreAllMocks();
  captured.instances.length = 0;
});
async function settle() {
  await nextTick();
  await nextTick();
}
it("remeasures the real list margin on window resize and surrounding layout changes", async () => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  let top = 200;
  const root = document.createElement("div");
  const box = document.createElement("div");
  box.dataset.adapttablePart = "scroll-box";
  root.append(box);
  document.body.append(root);
  vi.spyOn(box, "getBoundingClientRect").mockImplementation(() => ({
    top,
    left: 0,
    right: 400,
    bottom: top + 200,
    width: 400,
    height: 200,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }));
  const scope = effectScope();
  try {
    const shell = scope.run(() =>
      useDataTableShell({
        data: Array.from({ length: 100 }, (_, index) => ({
          id: String(index),
        })),
        columns: [{ key: "id" }],
        rowKey: (row) => row.id,
        urlSync: false,
        defaults: { limit: 100 },
        paginationMode: "infinite",
        features: [virtualize()],
      })
    )!;
    shell.setSurface({ rootElement: () => root, scrollElement: () => box });
    await settle();
    const page = captured.instances.at(-1)!;
    expect(page.options.scrollMargin).toBe(200);
    top = 400;
    window.dispatchEvent(new Event("resize"));
    await settle();
    expect(page.options.scrollMargin).toBe(400);
    top = 600;
    root.style.marginTop = "400px";
    await settle();
    expect(page.options.scrollMargin).toBe(600);
    scope.stop();
    top = 800;
    window.dispatchEvent(new Event("resize"));
    await settle();
    expect(page.options.scrollMargin).toBe(600);
  } finally {
    scope.stop();
    root.remove();
  }
});
it.each(["selection-header", "expand-header"])(
  "reveals columns inside measured %s and both logical pin regions",
  async (part) => {
    const root = document.createElement("div");
    const box = document.createElement("div");
    box.dataset.adapttablePart = "scroll-box";
    const injected = document.createElement("div");
    injected.dataset.adapttablePart = part;
    box.append(injected);
    root.append(box);
    document.body.append(root);
    Object.defineProperty(box, "clientWidth", { value: 300 });
    vi.spyOn(box, "getBoundingClientRect").mockReturnValue({
      top: 0,
      left: 0,
      right: 300,
      bottom: 200,
      width: 300,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    vi.spyOn(injected, "getBoundingClientRect").mockReturnValue({
      top: 0,
      left: 0,
      right: 40,
      bottom: 20,
      width: 40,
      height: 20,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const rtl = shallowRef(false);
    const scope = effectScope();
    try {
      const shell = scope.run(() =>
        useDataTableShell(() => ({
          data: [{ id: "a" }],
          rowKey: (row: { id: string }) => row.id,
          columns: [
            { key: "start" },
            { key: "a" },
            { key: "b" },
            { key: "end" },
          ],
          columnWidths: { start: 100, a: 100, b: 100, end: 100 },
          defaultColumnLayout: { pinned: { start: "start", end: "end" } },
          dir: rtl.value ? "rtl" : "ltr",
          urlSync: false,
          features: [virtualize({ maxHeight: 240, virtualizeColumns: true })],
        }))
      )!;
      shell.setSurface({ rootElement: () => root, scrollElement: () => box });
      await settle();
      shell.bodyWindow.value!.scrollToColumn("b");
      expect(box.scrollLeft).toBe(140);
      box.scrollLeft = 0;
      rtl.value = true;
      await settle();
      shell.bodyWindow.value!.scrollToColumn("b");
      expect(box.scrollLeft).toBe(-140);
      expect(
        shell.desktop.value.headers.map((header) => header.key).at(-1)
      ).toBe("end");
    } finally {
      scope.stop();
      root.remove();
    }
  }
);
