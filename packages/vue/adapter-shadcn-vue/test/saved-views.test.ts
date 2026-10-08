import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { savedViews } from "../src/saved-views";

interface Row {
  id: string;
  name: string;
  team: string;
}
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
function mount(features: DataTableProps<Row>["features"]) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: [{ id: "a", name: "Ada", team: "Engineering" }],
        columns: [{ key: "name" }, { key: "team" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        features,
      }),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
const part = (name: string) => `[data-adapttable-part="${name}"]`;
function find<T extends HTMLElement>(root: ParentNode, name: string): T {
  const result = root.querySelector<T>(part(name));
  if (!result) throw new Error(`Missing ${name}`);
  return result;
}
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 15));
  await nextTick();
}
function escape(target: HTMLElement) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
  );
}
it("saves a real view through the shared model and shadcn managed popup", async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
  const host = mount([savedViews({ storageKey: "shadcn-views", storage })]);
  const trigger = find<HTMLButtonElement>(host, "views-button");
  vi.spyOn(trigger, "getClientRects").mockReturnValue([
    new DOMRect(0, 0, 100, 44),
  ] as unknown as DOMRectList);
  trigger.focus();
  trigger.click();
  await flush();
  const panel = find<HTMLElement>(document, "views-panel");
  expect(host.contains(panel)).toBe(false);
  const name = find<HTMLInputElement>(panel, "views-input");
  name.value = "My table";
  name.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  find<HTMLButtonElement>(panel, "views-save").click();
  await flush();
  expect(storage.getItem("shadcn-views")).toContain("My table");
  expect(find(document, "views-item").textContent).toContain("My table");
  escape(find(document, "views-input"));
  await flush();
  expect(document.querySelector(part("views-panel"))).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
