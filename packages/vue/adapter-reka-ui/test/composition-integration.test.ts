import type { ColumnLayoutState } from "@adapttable/vue";
import { Primitive } from "reka-ui";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { DataTable } from "../src";
import { nestedTable } from "../src/nested-table";
import { resizableColumns } from "../src/resizable-columns";

const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
function mount(render: () => ReturnType<typeof h>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 10));
  await nextTick();
}
function element<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const result = root.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}
it.each(["ltr", "rtl"] as const)(
  "keeps Reka resize targets controlled and keyboard-aware in %s",
  async (dir) => {
    const layout = shallowRef<ColumnLayoutState>({
      order: [],
      hidden: [],
      pinned: {},
      widths: { name: 100 },
    });
    const accept = shallowRef(false);
    const change = vi.fn((next: ColumnLayoutState) => {
      if (accept.value) layout.value = next;
    });
    const host = mount(() =>
      h(DataTable<{ id: string; name: string }>, {
        data: [{ id: "a", name: "Ada" }],
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        dir,
        features: [resizableColumns()],
        columnLayout: layout.value,
        "onUpdate:columnLayout": change,
        classNames: { resizeHandle: "consumer-resize" },
      })
    );
    await flush();
    const handle = element(host, '[data-adapttable-part="resize-handle"]');
    expect(handle.classList.contains("at-reka-resize-handle")).toBe(true);
    expect(handle.classList.contains("consumer-resize")).toBe(true);
    expect(handle.getAttribute("role")).toBe("button");
    expect(handle.tabIndex).toBe(0);
    const header = element<HTMLTableCellElement>(host, "th");
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, 0, 100, 30)
    );
    const key = () =>
      handle.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: dir === "rtl" ? "ArrowLeft" : "ArrowRight",
          bubbles: true,
          cancelable: true,
        })
      );
    handle.focus();
    key();
    await flush();
    expect(change).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenLastCalledWith(
      expect.objectContaining({ widths: { name: 116 } })
    );
    expect(layout.value.widths.name).toBe(100);
    accept.value = true;
    key();
    await flush();
    expect(change).toHaveBeenCalledTimes(2);
    expect(layout.value.widths.name).toBe(116);
    expect(document.activeElement).toBe(handle);
  }
);
it("keeps a nested Reka table and its focused child control stable across parent updates", async () => {
  interface Parent {
    id: string;
    name: string;
  }
  interface Child {
    id: string;
    note: string;
  }
  const density = shallowRef<"comfortable" | "compact">("comfortable");
  const feature = nestedTable<Parent>(
    (row) => ({
      label: `${row.name} notes`,
      table: (defaults) =>
        h(
          DataTable<Child>,
          {
            ...defaults,
            data: [{ id: "note", note: "Child note" }],
            columns: [{ key: "note" }],
            rowKey: (child) => child.id,
            urlSync: false,
            forceMobile: false,
            searchable: false,
          },
          {
            cell: () =>
              h(Primitive, { as: "input", "aria-label": "Child draft" }),
          }
        ),
    }),
    ["a"]
  );
  const host = mount(() =>
    h(DataTable<Parent>, {
      data: [{ id: "a", name: "Ada" }],
      columns: [{ key: "name" }],
      rowKey: (row) => row.id,
      features: [feature],
      density: density.value,
      urlSync: false,
      forceMobile: false,
    })
  );
  await flush();
  expect(host.querySelectorAll('[data-adapttable-kit="reka-ui"]')).toHaveLength(
    2
  );
  const input = element<HTMLInputElement>(host, '[aria-label="Child draft"]');
  input.focus();
  input.value = "Uncommitted note";
  density.value = "compact";
  await flush();
  expect(element(host, '[aria-label="Child draft"]')).toBe(input);
  expect(input.value).toBe("Uncommitted note");
  expect(document.activeElement).toBe(input);
});
