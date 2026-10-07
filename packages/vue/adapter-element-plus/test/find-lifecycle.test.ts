import type { DataTableProps } from "@adapttable/vue/adapter";
import { ElMessageBox } from "element-plus";
import { describe, expect, it, vi } from "vitest";
import { h, KeepAlive, nextTick, ref } from "vue";

import DataTable from "../src/DataTable.vue";
import { filters } from "../src/filters";
import { findInTable } from "../src/find-in-table";
import { rowActions } from "../src/row-actions";
import { mount, node } from "./mount";
interface Row {
  id: string;
  name: string;
}
const data: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Grace" },
];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
}
function cached(extra: Partial<DataTableProps<Row>>) {
  const active = ref(true);
  const view = mount(() =>
    h(KeepAlive, null, {
      default: () =>
        active.value
          ? h(DataTable<Row>, {
              data,
              columns: [{ key: "name" }],
              rowKey: (row) => row.id,
              urlSync: false,
              searchable: false,
              forceMobile: false,
              ...extra,
            })
          : h("span"),
    })
  );
  return { ...view, active };
}
function option(root: ParentNode, text: string) {
  const result = [
    ...root.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((item) => item.textContent?.trim() === text);
  if (!result) throw new Error(`Missing option ${text}`);
  return result;
}
describe("Element Plus cached widget lifetime", () => {
  for (const mode of ["popover", "drawer"] as const) {
    it(`${mode}: removes an open nested portal, preserves the accepted filter and revokes stale controls`, async () => {
      const view = cached({
        features: [
          filters<Row>(
            [
              {
                key: "name",
                type: "select",
                options: [
                  { value: "Ada", label: "Ada" },
                  { value: "Grace", label: "Grace" },
                ],
              },
            ],
            { mode }
          ),
        ],
      });
      await tick();
      const trigger = node<HTMLButtonElement>(
        view.root,
        part("filters-button")
      );
      trigger.click();
      await tick();
      const panelPart = mode === "drawer" ? "filters-panel" : "filters-popover";
      const panel = node<HTMLElement>(document, part(panelPart));
      expect(view.root.contains(panel)).toBe(false);
      const input = node<HTMLInputElement>(panel, '[role="combobox"]');
      input.click();
      await tick();
      option(panel, "Ada").click();
      await tick();
      await vi.waitFor(() =>
        expect(view.root.querySelectorAll("tbody tr")).toHaveLength(1)
      );
      expect(node(view.root, "tbody").textContent).toContain("Ada");
      input.click();
      await tick();
      expect(input.getAttribute("aria-expanded")).toBe("true");
      const stale = option(panel, "Grace");
      view.active.value = false;
      await tick();
      await vi.waitFor(() =>
        expect(document.querySelector(part(panelPart))).toBeNull()
      );
      expect(panel.isConnected).toBe(false);
      expect(stale.isConnected).toBe(false);
      stale.click();
      await tick();
      view.active.value = true;
      await tick();
      expect(node(view.root, part("filters-button"))).toBe(trigger);
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      expect(node(view.root, "tbody").textContent).toContain("Ada");
      expect(node(view.root, "tbody").textContent).not.toContain("Grace");
      const reopened = node<HTMLElement>(document, part(panelPart));
      expect(reopened).not.toBe(panel);
      expect(
        node(reopened, '[role="combobox"]').getAttribute("aria-expanded")
      ).toBe("false");
      const currentInput = node<HTMLInputElement>(
        reopened,
        '[role="combobox"]'
      );
      currentInput.click();
      await tick();
      expect(option(reopened, "Ada").getAttribute("aria-selected")).toBe(
        "true"
      );
      expect(option(reopened, "Grace").getAttribute("aria-selected")).toBe(
        "false"
      );
      currentInput.focus();
      currentInput.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
      await tick();
      expect(currentInput.getAttribute("aria-expanded")).toBe("false");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      currentInput.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        })
      );
      await tick();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
      trigger.click();
      await tick();
      expect(document.querySelector(part(panelPart))).not.toBeNull();
      view.unmount();
      await tick();
      await vi.waitFor(() =>
        expect(document.querySelector(part(panelPart))).toBeNull()
      );
      stale.click();
      await tick();
      expect(document.querySelector(part(panelPart))).toBeNull();
    });
  }
  it("suspends Find keyboard ownership without discarding its query or reviving stale controls", async () => {
    const view = cached({ features: [findInTable({ button: true })] });
    await tick();
    const trigger = node<HTMLButtonElement>(view.root, part("find-button"));
    trigger.focus();
    trigger.click();
    await tick();
    const input = node<HTMLInputElement>(view.root, part("find-input"));
    input.value = "Ada";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    view.active.value = false;
    await tick();
    const event = new KeyboardEvent("keydown", {
      key: "f",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(view.root.querySelector(part("find-input"))).toBeNull();
    input.value = "Grace";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await tick();
    view.active.value = true;
    await tick();
    const reopened = node<HTMLInputElement>(view.root, part("find-input"));
    expect(reopened.value).toBe("Ada");
    expect(view.root.querySelectorAll("[data-cell-match]")).toHaveLength(1);
    view.unmount();
    await tick();
    const after = new KeyboardEvent("keydown", {
      key: "f",
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });
  it("retires a pending menu confirmation on deactivation and returns a new dialog to its visible trigger", async () => {
    const show = vi.spyOn(ElMessageBox, "confirm");
    const settled = vi.fn();
    const run = vi.fn();
    const view = cached({
      rowActionsLayout: "menu",
      features: [
        rowActions<Row>([
          {
            key: "remove",
            label: "Remove",
            onClick: run,
            confirm: {
              title: "Delete record",
              confirmLabel: "Delete now",
              message: (row) => `Remove ${row.name}?`,
            },
          },
        ]),
      ],
    });
    await tick();
    let trigger = node<HTMLButtonElement>(
      view.root,
      part("row-actions-trigger")
    );
    async function open() {
      trigger.focus();
      trigger.click();
      await tick();
      const item = node<HTMLElement>(
        view.root,
        `${part("action-button")}[aria-label="Remove"]`
      );
      item.focus();
      item.click();
      await tick();
    }
    await open();
    const dialog = node<HTMLElement>(
      document,
      '.el-overlay-message-box[role="dialog"]'
    );
    const stale = node<HTMLButtonElement>(
      dialog,
      ".el-message-box__btns button:last-child"
    );
    const pending = show.mock.results[0]?.value;
    if (!pending) throw new Error("Missing genuine confirmation promise");
    void pending.then(settled, settled);
    view.active.value = false;
    await tick();
    await vi.waitFor(() =>
      expect(settled).toHaveBeenCalledExactlyOnceWith("close")
    );
    await vi.waitFor(() =>
      expect(document.querySelector(".el-message-box")).toBeNull()
    );
    stale.click();
    await tick();
    expect(run).not.toHaveBeenCalled();
    view.active.value = true;
    await tick();
    const retired = trigger;
    expect(retired.isConnected).toBe(false);
    retired.click();
    await tick();
    // ElMessageBox removes its retiring DOM after its native leave transition.
    await vi.waitFor(() =>
      expect(document.querySelector(".el-message-box")).toBeNull()
    );
    expect(run).not.toHaveBeenCalled();
    trigger = node<HTMLButtonElement>(view.root, part("row-actions-trigger"));
    expect(trigger).not.toBe(retired);
    await open();
    const current = node<HTMLElement>(
      document,
      '.el-overlay-message-box[role="dialog"]'
    );
    node<HTMLButtonElement>(
      current,
      ".el-message-box__btns button:first-child"
    ).click();
    await tick();
    await vi.waitFor(() =>
      expect(document.querySelector(".el-message-box")).toBeNull()
    );
    expect(document.activeElement).toBe(trigger);
    expect(trigger.isConnected).toBe(true);
    expect(run).not.toHaveBeenCalled();
    await open();
    view.unmount();
    await tick();
    await vi.waitFor(() =>
      expect(document.querySelector(".el-message-box")).toBeNull()
    );
    expect(run).not.toHaveBeenCalled();
  });
});
