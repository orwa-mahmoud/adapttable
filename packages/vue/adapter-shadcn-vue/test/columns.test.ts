import { renderToString } from "@vue/server-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSSRApp, h, nextTick } from "vue";

import { DataTable } from "../src";
import { columnMenu } from "../src/column-menu";
import { filters } from "../src/filters";
import {
  find,
  key,
  mountFeatures,
  original,
  part,
  type Row,
  tick,
  write,
} from "./feature-helpers";

beforeEach(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {
        return undefined;
      }
      unobserve() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    }
  )
);
afterEach(() => vi.unstubAllGlobals());
async function settle() {
  await tick();
  await new Promise((resolve) => setTimeout(resolve, 30));
  await nextTick();
}
function visible(element: HTMLElement) {
  vi.spyOn(element, "getClientRects").mockReturnValue([
    new DOMRect(0, 0, 100, 44),
  ] as unknown as DOMRectList);
}
const columns = [
  { key: "name", header: "Name", renameable: true, filter: { type: "text" } },
  { key: "amount", header: "Amount" },
] as const;
async function open(root: ParentNode) {
  const trigger = find<HTMLButtonElement>(root, part("column-menu-button"));
  visible(trigger);
  trigger.focus();
  trigger.click();
  await settle();
  return trigger;
}

describe("shadcn managed Columns", () => {
  it("maps trigger/search/panel hooks to actual shadcn targets and returns Escape focus", async () => {
    const { root } = mountFeatures([columnMenu()], {
      columns,
      classNames: {
        columnMenuButton: "custom-trigger",
        columnMenuPanel: "custom-panel",
        columnMenuSearch: "custom-search",
      },
    });
    const trigger = await open(root);
    expect(trigger.getAttribute("data-slot")).toBe("button");
    expect(trigger.classList.contains("custom-trigger")).toBe(true);
    const panel = find<HTMLElement>(document.body, part("column-menu-panel"));
    expect(root.contains(panel)).toBe(false);
    expect(panel.getAttribute("data-slot")).toBe("popover-content");
    expect(panel.classList.contains("custom-panel")).toBe(true);
    const search = find<HTMLInputElement>(panel, part("column-menu-search"));
    expect(document.activeElement).toBe(search);
    expect(search.classList.contains("custom-search")).toBe(true);
    await write(search, "Amount");
    expect(document.activeElement).toBe(search);
    expect(panel.querySelectorAll(part("column-menu-item"))).toHaveLength(1);
    key(search, "Escape");
    await settle();
    expect(document.body.querySelector(part("column-menu-panel"))).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("uses binding visibility/pinning and direct rename without owning column state", async () => {
    const { root } = mountFeatures([columnMenu()], { columns });
    await open(root);
    const hide = find<HTMLButtonElement>(
      document.body,
      part("column-menu-visibility")
    );
    hide.click();
    await settle();
    expect(root.querySelector('th[data-column-key="name"]')).toBeNull();
    hide.click();
    await settle();
    const pin = find<HTMLButtonElement>(document.body, part("column-menu-pin"));
    pin.click();
    await settle();
    expect(
      root
        .querySelector('th[data-column-key="name"]')
        ?.getAttribute("data-pinned")
    ).toBe("start");
    key(find(document.body, part("column-menu-search")), "Escape");
    await settle();
    find<HTMLButtonElement>(root, part("header-rename-button")).click();
    await tick();
    const input = find<HTMLInputElement>(root, part("header-rename-input"));
    expect(input.getAttribute("data-slot")).toBe("input");
    await write(input, "Person");
    key(input, "Enter");
    await tick();
    expect(
      root.querySelector('th[data-column-key="name"]')?.textContent
    ).toContain("Person");
  });
  it("routes the column filter action to the real kit panel", async () => {
    const { root } = mountFeatures([columnMenu(), filters<Row>()], { columns });
    await open(root);
    find<HTMLButtonElement>(document.body, part("column-menu-more")).click();
    await settle();
    const action = [
      ...document.body.querySelectorAll<HTMLButtonElement>(
        part("column-menu-action")
      ),
    ].find((node) => node.textContent === "Filter column");
    if (!action) throw new Error("Missing Filter action");
    action.click();
    await settle();
    expect(document.body.querySelector(part("column-menu-panel"))).toBeNull();
    const panel = find(document.body, part("filters-popover"));
    expect(find(panel, part("filter-input")).getAttribute("data-slot")).toBe(
      "input"
    );
  });
  it("keeps portaled direction live and retires menus when features deactivate", async () => {
    const { root, props } = mountFeatures([columnMenu()], {
      columns,
      forceMobile: true,
    });
    await open(root);
    props.value = { ...props.value, dir: "rtl" };
    await settle();
    expect(
      find(document.body, part("column-menu-panel")).getAttribute("dir")
    ).toBe("rtl");
    props.value = { ...props.value, features: [] };
    await settle();
    expect(document.body.querySelector(part("column-menu-panel"))).toBeNull();
    expect(root.querySelector(part("column-menu-button"))).toBeNull();
  });
  it("dismisses a nested column action group before the outer popover", async () => {
    const { root } = mountFeatures([columnMenu()], { columns });
    await open(root);
    const more = find<HTMLButtonElement>(
      document.body,
      part("column-menu-more")
    );
    more.click();
    await settle();
    const action = find<HTMLButtonElement>(
      document.body,
      part("column-menu-action")
    );
    action.focus();
    key(action, "Escape");
    await settle();
    expect(document.body.querySelector(part("column-menu-submenu"))).toBeNull();
    expect(
      document.body.querySelector(part("column-menu-panel"))
    ).not.toBeNull();
    expect(document.activeElement).toBe(more);
    key(more, "Escape");
    await settle();
    expect(document.body.querySelector(part("column-menu-panel"))).toBeNull();
  });
  it("does not restore focus to a hidden or synchronously disposed trigger", async () => {
    const { root, stop } = mountFeatures([columnMenu()], { columns });
    const trigger = await open(root);
    const spy = vi.spyOn(trigger, "focus");
    trigger.hidden = true;
    key(find(document.body, part("column-menu-search")), "Escape");
    await settle();
    expect(spy).not.toHaveBeenCalled();
    trigger.hidden = false;
    trigger.click();
    await settle();
    spy.mockClear();
    key(find(document.body, part("column-menu-search")), "Escape");
    stop();
    await settle();
    expect(spy).not.toHaveBeenCalled();
  });
  it("server renders a closed named trigger without portal or browser access", async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(DataTable<Row>, {
            data: [original],
            columns,
            rowKey: (row) => row.id,
            searchable: false,
            urlSync: false,
            features: [columnMenu()],
          }),
      })
    );
    expect(html).toContain('data-adapttable-part="column-menu-button"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('data-adapttable-part="column-menu-panel"');
  });
});
