import type { RowActionsLayout } from "@adapttable/vue/adapter";
import {
  rowActions as bindingRowActions,
  rowPinning as bindingRowPinning,
} from "@adapttable/vue/features";
import ui from "@nuxt/ui/vue-plugin";
import { describe, expect, it, vi } from "vitest";
import { createApp, h } from "vue";

import { DataTable } from "../src";
import { rowActions } from "../src/row-actions";
import { rowPinning } from "../src/row-pinning";
import {
  rowActions as aggregateRowActions,
  rowPinning as aggregateRowPinning,
} from "../src/rows";
import { find, mountNuxt, part, tick } from "./actions.helpers";

interface Row {
  id: string;
  name: string;
}
const data: readonly Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
function table(options: {
  readonly layout?: RowActionsLayout;
  readonly mobile?: boolean;
  readonly view?: (row: Row) => void;
  readonly archive?: (row: Row) => void;
}) {
  return mountNuxt(() =>
    h(DataTable<Row>, {
      data,
      columns: [{ key: "name", header: "Name" }],
      rowKey: (row) => row.id,
      urlSync: false,
      searchable: false,
      forceMobile: options.mobile ?? false,
      rowActionsLayout: options.layout,
      classNames: {
        rowActionsMenu: "custom-menu",
        rowActionsTrigger: "custom-trigger",
        rowAction: "custom-action",
      },
      features: [
        rowActions<Row>([
          { key: "view", label: "View", onClick: options.view ?? vi.fn() },
          {
            key: "archive",
            label: "Archive",
            onClick: options.archive ?? vi.fn(),
            isDisabled: (row) => row.id === "a",
          },
          { key: "share", label: "Share", onClick: vi.fn() },
        ]),
      ],
    })
  );
}
const key = async (target: Element, value: string) => {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
  await tick();
};
const menuItems = () => [
  ...document.querySelectorAll<HTMLButtonElement>(
    '[role="menu"] button[role="menuitem"]'
  ),
];

describe("Nuxt UI row actions", () => {
  it("renders inline Nuxt buttons by default", async () => {
    const view = vi.fn();
    const { host } = table({ view });
    await tick();
    expect(host.querySelector(part("row-actions-menu"))).toBeNull();
    const buttons = host.querySelectorAll<HTMLButtonElement>(
      `tbody tr:first-child ${part("action-button")}`
    );
    expect([...buttons].map((button) => button.textContent)).toEqual([
      "View",
      "Archive",
      "Share",
    ]);
    expect(buttons[0]!.classList.contains("custom-action")).toBe(true);
    expect(buttons[1]!.disabled).toBe(true);
    buttons[0]!.click();
    expect(view).toHaveBeenCalledExactlyOnceWith(data[0]);
  });

  it.each([false, true])(
    "opens a keyboard menu behind one trigger, mobile=%s",
    async (mobile) => {
      const view = vi.fn();
      const archive = vi.fn();
      const { host } = table({ layout: "menu", mobile, view, archive });
      await tick();
      const menu = find(host, part("row-actions-menu"));
      expect(menu.classList.contains("custom-menu")).toBe(true);
      expect(host.querySelector(part("action-button"))).toBeNull();
      const trigger = find<HTMLButtonElement>(
        menu,
        part("row-actions-trigger")
      );
      expect(trigger.classList.contains("custom-trigger")).toBe(true);
      expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      trigger.focus();
      trigger.click();
      await tick();
      await vi.waitFor(() => expect(menuItems()).toHaveLength(3));
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(trigger.getAttribute("aria-controls")).toBe(
        find(document, '[role="menu"]').id
      );
      const [first, second, third] = menuItems();
      expect(first!.dataset.adapttablePart).toBe("action-button");
      expect(second!.disabled).toBe(true);
      await vi.waitFor(() => expect(document.activeElement).toBe(first));
      await key(first!, "ArrowDown");
      expect(document.activeElement).toBe(third);
      await key(third!, "ArrowDown");
      expect(document.activeElement).toBe(first);
      second!.click();
      await tick();
      expect(archive).not.toHaveBeenCalled();
      expect(menuItems()).toHaveLength(3);
      first!.click();
      await tick();
      expect(view).toHaveBeenCalledExactlyOnceWith(data[0]);
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      await vi.waitFor(() => expect(menuItems()).toHaveLength(0));
      expect(document.activeElement).toBe(trigger);
    }
  );

  it("closes the menu on Escape and returns focus to the trigger", async () => {
    const { host } = table({ layout: "menu" });
    await tick();
    const trigger = find<HTMLButtonElement>(host, part("row-actions-trigger"));
    trigger.focus();
    await key(trigger, "ArrowUp");
    await vi.waitFor(() => expect(menuItems()).toHaveLength(3));
    await vi.waitFor(() => expect(document.activeElement).toBe(menuItems()[2]));
    await key(document.activeElement!, "Escape");
    await vi.waitFor(() => expect(menuItems()).toHaveLength(0));
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("puts pin controls in the same menu", async () => {
    const { host } = mountNuxt(() =>
      h(DataTable<Row>, {
        data,
        columns: [{ key: "name", header: "Name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        searchable: false,
        forceMobile: false,
        rowActionsLayout: "menu",
        features: [rowPinning()],
      })
    );
    await tick();
    find<HTMLButtonElement>(host, part("row-actions-trigger")).click();
    await tick();
    await vi.waitFor(() => expect(menuItems().length).toBeGreaterThan(0));
  });

  it("keeps the aggregate row exports on the kit's own features", () => {
    expect(aggregateRowActions).toBe(rowActions);
    expect(aggregateRowPinning).toBe(rowPinning);
  });

  it.each([
    ["actions", () => bindingRowActions<Row>([{ key: "view", label: "View" }])],
    ["pinning", () => bindingRowPinning()],
  ] as const)(
    "requires the kit's own row %s feature",
    async (_name, feature) => {
      const errors: unknown[] = [];
      const host = document.createElement("div");
      document.body.append(host);
      const app = createApp({
        render: () =>
          h(DataTable<Row>, {
            data,
            columns: [{ key: "name" }],
            rowKey: (row) => row.id,
            urlSync: false,
            searchable: false,
            forceMobile: false,
            features: [feature()],
          }),
      }).use(ui);
      app.config.errorHandler = (error) => {
        errors.push(error);
      };
      app.mount(host);
      await tick();
      app.unmount();
      host.remove();
      expect(errors.length).toBeGreaterThan(0);
      for (const error of errors)
        expect(error instanceof Error ? error.message : error).toBe(
          "AdaptTable: Nuxt UI row actions require rowActions() or rowPinning() from @adapttable/nuxt-ui."
        );
    }
  );
});
