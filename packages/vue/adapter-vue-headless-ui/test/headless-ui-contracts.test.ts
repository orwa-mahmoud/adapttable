import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { provideHeadlessDirection } from "../src/controls/direction";
import { HeadlessMenu, headlessMenuItem } from "../src/controls/menu";
import {
  headlessPortal,
  hostPortalRoot,
  provideHeadlessPortalContainer,
} from "../src/controls/portal";
import { headlessSelect } from "../src/controls/select";
import { singleHandlers } from "../src/controls/target";
import { filters } from "../src/filters";

interface Row {
  id: string;
  name: string;
}
const defaults: DataTableProps<Row> = {
  data: [{ id: "a", name: "Ada" }],
  columns: [{ key: "name" }],
  rowKey: (row) => row.id,
  urlSync: false,
  forceMobile: false,
  searchDebounceMs: 0,
};
const stops: (() => void)[] = [];
afterEach(() => {
  stops
    .splice(0)
    .reverse()
    .forEach((stop) => stop());
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
function press(target: Element, key: string) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
  );
}

describe("Headless UI contracts", () => {
  it("folds merged handler lists into one function in order", () => {
    const calls: string[] = [];
    const merged = singleHandlers({
      onClick: [() => calls.push("a"), () => calls.push("b"), "skipped"],
      onFocus: () => calls.push("focus"),
      title: "kept",
    });
    expect(typeof merged.onClick).toBe("function");
    (merged.onClick as () => void)();
    expect(calls).toEqual(["a", "b"]);
    expect(merged.onFocus).toBeTypeOf("function");
    expect(merged.title).toBe("kept");
  });

  it("moves the one portal root into a container and back to the page", () => {
    const container = document.createElement("section");
    document.body.append(container);
    hostPortalRoot(undefined);
    const root = document.getElementById("headlessui-portal-root");
    expect(root?.parentElement).toBe(document.body);
    hostPortalRoot(container);
    expect(document.getElementById("headlessui-portal-root")).toBe(root);
    expect(root?.parentElement).toBe(container);
    hostPortalRoot(undefined);
    expect(root?.parentElement).toBe(document.body);
  });

  it("opens a menu on its first enabled item and returns focus on Escape", async () => {
    const chosen = vi.fn();
    mount(() =>
      h(
        HeadlessMenu,
        { triggerAttrs: { "aria-label": "Actions" } },
        {
          trigger: () => "Open",
          default: () => [
            headlessMenuItem({ onClick: vi.fn() }, () => "Off", true),
            headlessMenuItem({ onClick: chosen }, () => "On"),
          ],
        }
      )
    );
    await flush();
    const trigger = document.querySelector<HTMLElement>(
      '[aria-label="Actions"]'
    );
    trigger?.focus();
    trigger?.click();
    await flush();
    const menu = document.querySelector('[role="menu"]');
    expect(document.activeElement?.textContent).toBe("On");
    expect(menu?.getAttribute("aria-activedescendant")).toBe(
      document.activeElement?.id
    );
    press(menu!, "Escape");
    await flush();
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(chosen).not.toHaveBeenCalled();
  });

  it("starts a select on its current value and takes direction from the table", async () => {
    const change = vi.fn();
    const Host = defineComponent({
      setup() {
        provideHeadlessDirection(() => "rtl");
        return () =>
          headlessSelect({
            attrs: { "aria-label": "Status" },
            value: "b",
            options: [
              { value: "a", label: "Alpha" },
              { value: "b", label: "Beta" },
            ],
            onChange: change,
          });
      },
    });
    mount(() => h(Host));
    await flush();
    const trigger = document.querySelector<HTMLElement>(
      '[aria-label="Status"]'
    );
    trigger?.click();
    await flush();
    const list = document.querySelector('[role="listbox"]');
    expect(list?.getAttribute("dir")).toBe("rtl");
    expect(document.activeElement?.textContent).toContain("Beta");
    press(list!, "ArrowUp");
    press(list!, "Enter");
    await flush();
    expect(change).toHaveBeenCalledExactlyOnceWith("a");
  });

  it("places portalled content in the inherited container, then moves it with the container", async () => {
    const container = document.createElement("section");
    document.body.append(container);
    const Host = defineComponent({
      setup() {
        provideHeadlessPortalContainer(() => container);
        return () => headlessPortal(() => h("p", { id: "floating" }, "Hi"));
      },
    });
    mount(() => h(Host));
    await flush();
    expect(container.querySelector("#floating")).not.toBeNull();
  });

  it("closes the non-modal filter popover on an outside press without moving focus back", async () => {
    const host = mount(() =>
      h("div", [
        h("input", { id: "elsewhere" }),
        h(DataTable<Row>, {
          ...defaults,
          features: [filters<Row>([{ key: "name", type: "text" }])],
        }),
      ])
    );
    await flush();
    const trigger = host.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="filters-button"]'
    );
    trigger?.click();
    await flush();
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(
      document.querySelector('[data-adapttable-part="filters-backdrop"]')
    ).toBeNull();
    const outside = host.querySelector<HTMLInputElement>("#elsewhere");
    outside?.focus();
    outside?.dispatchEvent(
      new MouseEvent("pointerdown", { bubbles: true, button: 0 })
    );
    await flush();
    expect(
      document.querySelector('[data-adapttable-part="filters-popover"]')
    ).toBeNull();
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(outside);
  });
});
