import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";

import { useMountStagger } from "../src/motion/useMountStagger";
import { useFrontendData } from "../src/source/useFrontendData";
import { useDataTable } from "../src/useDataTable";

interface Person {
  id: string;
  name: string;
}

function media(reduced: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce") && reduced,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
}

async function mount(enabled: boolean): Promise<HTMLElement> {
  const root = document.createElement("div");
  const Host = defineComponent({
    setup() {
      const target = shallowRef<HTMLElement | null>(null);
      useMountStagger(
        target,
        () => [2],
        () => ({ enabled })
      );
      return () =>
        h("div", { ref: target }, [
          h("span", { "data-stagger": "" }, "a"),
          h("span", { "data-stagger": "" }, "b"),
        ]);
    },
  });
  createApp(Host).mount(root);
  await nextTick();
  return root;
}

describe("useMountStagger", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it("animates data-stagger items when enabled", async () => {
    media(false);
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    await mount(true);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls[1]?.[1]).toMatchObject({ delay: 40 });
  });

  it("does nothing when disabled", async () => {
    media(false);
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    await mount(false);
    expect(animate).not.toHaveBeenCalled();
  });

  it("does nothing when the reader prefers reduced motion", async () => {
    media(true);
    const animate = vi.fn();
    (Element.prototype as { animate?: unknown }).animate = animate;
    await mount(true);
    expect(animate).not.toHaveBeenCalled();
  });
});

describe("row and card marks", () => {
  it("tags every row and card even when animate is off", () => {
    const person: Person = { id: "a", name: "Ada" };
    const columns = [{ key: "name", accessor: (row: Person) => row.name }];
    let rowMark = "";
    let cardMark = "";
    const Host = defineComponent({
      setup() {
        const source = useFrontendData({
          data: [person],
          columns,
          getRowId: (row) => row.id,
          urlSync: false,
        });
        const table = useDataTable({
          source,
          columns,
          rowKey: (row) => row.id,
        });
        rowMark = String(table.rowAttrs(person, 0)["data-stagger"]);
        cardMark = String(table.cardAttrs(person, 0)["data-stagger"]);
        return () => h("div");
      },
    });
    const root = document.createElement("div");
    const app = createApp(Host);
    app.mount(root);
    expect(rowMark).toBe("");
    expect(cardMark).toBe("");
    app.unmount();
  });
});
