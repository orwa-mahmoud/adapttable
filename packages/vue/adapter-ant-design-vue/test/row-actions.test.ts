import type { DataTableProps } from "@adapttable/vue/adapter";
import { Modal } from "ant-design-vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, KeepAlive, nextTick, ref, shallowRef } from "vue";

import DataTable from "../src/DataTable.vue";
import { fullscreen } from "../src/fullscreen";
import { rowActions } from "../src/row-actions";
import { finishMotion, mount, node } from "./mount";
interface Row {
  id: string;
  team: string;
  amount: number;
}
const rows: readonly Row[] = [
  { id: "a", team: "Core", amount: 1 },
  { id: "b", team: "Design", amount: 2 },
];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 40));
  await nextTick();
}
function fixture(extra: Partial<DataTableProps<Row>>) {
  const props = shallowRef<DataTableProps<Row>>({
    data: rows,
    columns: [{ key: "team" }, { key: "amount" }],
    rowKey: (row) => row.id,
    searchable: false,
    urlSync: false,
    forceMobile: false,
    ...extra,
  });
  return { ...mount(() => h(DataTable<Row>, props.value)), props };
}
const restores: (() => void)[] = [];
afterEach(async () => {
  Modal.destroyAll();
  await tick();
  restores
    .splice(0)
    .reverse()
    .forEach((restore) => restore());
});
function platform(target: object, key: string, descriptor: PropertyDescriptor) {
  const original = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { ...descriptor, configurable: true });
  restores.push(() => {
    if (original) Object.defineProperty(target, key, original);
    else Reflect.deleteProperty(target, key);
  });
}
async function dialogButton(confirm: boolean) {
  const dialog = node<HTMLElement>(document, '.ant-modal-wrap[role="dialog"]');
  const buttons = dialog.querySelectorAll<HTMLButtonElement>(
    ".ant-modal-confirm-btns button"
  );
  expect(buttons).toHaveLength(2);
  const button = buttons[confirm ? 1 : 0]!;
  expect(button.classList.contains("ant-btn")).toBe(true);
  button.click();
  await tick();
  await vi.waitFor(() =>
    expect(document.querySelector(".ant-modal-confirm")).toBeNull()
  );
}
const removal = (run: (row: Row) => void) =>
  rowActions<Row>([
    {
      key: "remove",
      label: "Remove",
      onClick: run,
      confirm: {
        title: "Delete record",
        message: (row) => `Remove ${row.team}?`,
        confirmLabel: "Delete now",
        danger: true,
      },
    },
  ]);

describe("Ant Design Vue row actions", () => {
  for (const mobile of [false, true]) {
    for (const dismissal of ["cancel", "escape", "confirm"] as const) {
      it(`returns a menu confirmation to its visible trigger after ${dismissal}, mobile=${mobile}`, async () => {
        const run = vi.fn();
        const view = fixture({
          forceMobile: mobile,
          rowActionsLayout: "menu",
          features: [removal(run)],
        });
        await tick();
        const trigger = node<HTMLButtonElement>(
          view.root,
          part("row-actions-trigger")
        );
        trigger.focus();
        trigger.click();
        await tick();
        const action = node<HTMLElement>(
          view.root,
          `${part("action-button")}[aria-label="Remove"]`
        );
        action.focus();
        expect(document.activeElement).toBe(action);
        action.click();
        await tick();
        if (dismissal === "escape") {
          node<HTMLElement>(
            document,
            '.ant-modal-wrap[role="dialog"]'
          ).dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Escape",
              code: "Escape",
              keyCode: 27,
              which: 27,
              bubbles: true,
              cancelable: true,
            })
          );
          await tick();
          await vi.waitFor(() =>
            expect(document.querySelector(".ant-modal-confirm")).toBeNull()
          );
        } else await dialogButton(dismissal === "confirm");
        expect(trigger.isConnected).toBe(true);
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        expect(document.activeElement).toBe(trigger);
        if (dismissal === "confirm")
          expect(run).toHaveBeenCalledExactlyOnceWith(rows[0]);
        else expect(run).not.toHaveBeenCalled();
      });
    }
  }
  for (const mobile of [false, true]) {
    it(`uses the genuine dropdown menu and guards disabled actions, mobile=${mobile}`, async () => {
      const run = vi.fn();
      const blocked = vi.fn();
      const view = fixture({
        forceMobile: mobile,
        rowActionsLayout: "menu",
        features: [
          rowActions<Row>([
            { key: "open", label: "Open row", onClick: run },
            {
              key: "blocked",
              label: "Blocked row",
              onClick: blocked,
              isDisabled: () => true,
            },
          ]),
        ],
      });
      await tick();
      const trigger = node<HTMLButtonElement>(
        view.root,
        part("row-actions-trigger")
      );
      expect(trigger.tagName).toBe("BUTTON");
      expect(trigger.classList.contains("ant-btn")).toBe(true);
      trigger.click();
      await tick();
      const menu = node<HTMLElement>(view.root, '[role="menu"]');
      expect(menu.classList.contains("ant-dropdown-menu")).toBe(true);
      const disabled = node<HTMLElement>(
        menu,
        `${part("action-button")}[aria-label="Blocked row"]`
      );
      expect(disabled.getAttribute("aria-disabled")).toBe("true");
      disabled.click();
      await tick();
      expect(blocked).not.toHaveBeenCalled();
      const action = node<HTMLElement>(
        menu,
        `${part("action-button")}[aria-label="Open row"]`
      );
      expect(action.getAttribute("role")).toBe("menuitem");
      action.click();
      await tick();
      expect(run).toHaveBeenCalledExactlyOnceWith(rows[0]);
      expect(blocked).not.toHaveBeenCalled();
    });
  }
  for (const mobile of [false, true]) {
    it(`uses actual kit buttons and forwards original host rows exactly once, mobile=${mobile}`, async () => {
      const run = vi.fn();
      const add = vi.fn();
      const duplicate = vi.fn();
      const click = vi.fn();
      const { root } = fixture({
        forceMobile: mobile,
        features: [
          rowActions<Row>([{ key: "open", label: "Open row", onClick: run }], {
            onAddRow: add,
            onDuplicateRow: duplicate,
          }),
        ],
        classNames: { actionButton: "host-action", addRow: "host-add" },
      });
      root.addEventListener("click", click);
      await tick();
      const open = node<HTMLButtonElement>(
        root,
        `${part("action-button")}[aria-label="Open row"]`
      );
      expect(open.classList.contains("ant-btn")).toBe(true);
      expect(open.classList.contains("host-action")).toBe(true);
      open.click();
      await tick();
      expect(run).toHaveBeenCalledExactlyOnceWith(rows[0]);
      expect(click).not.toHaveBeenCalled();
      node<HTMLButtonElement>(root, part("add-row")).click();
      await tick();
      expect(add).toHaveBeenCalledTimes(1);
      const button = [
        ...root.querySelectorAll<HTMLButtonElement>(part("action-button")),
      ].find((button) =>
        button.getAttribute("aria-label")?.includes("Duplicate")
      );
      if (!button) throw new Error("Missing duplicate action");
      button.click();
      await tick();
      expect(duplicate).toHaveBeenCalledExactlyOnceWith(rows[0]);
      expect(root.textContent).toContain("Core");
      expect(root.textContent).toContain("Design");
    });
  }
  it("uses the genuine confirmation dialog and keeps cancel separate from acceptance", async () => {
    const show = vi.spyOn(Modal, "confirm");
    const run = vi.fn();
    const { root } = fixture({ features: [removal(run)], dir: "rtl" });
    await tick();
    node<HTMLButtonElement>(root, part("action-button")).click();
    await tick();
    const dialog = node<HTMLElement>(document, ".ant-modal-confirm");
    expect(dialog.textContent).toContain("Delete record");
    expect(dialog.classList.contains("ant-modal-confirm-rtl")).toBe(true);
    expect(show.mock.calls[0]?.[0].appContext).toBeTruthy();
    expect(dialog.textContent).toContain("Remove Core?");
    expect(run).not.toHaveBeenCalled();
    await dialogButton(false);
    expect(run).not.toHaveBeenCalled();
    node<HTMLButtonElement>(root, part("action-button")).click();
    await tick();
    await dialogButton(true);
    expect(run).toHaveBeenCalledExactlyOnceWith(rows[0]);
    expect(root.textContent).toContain("Core");
  });
  it("does not run a confirmed action after its contribution was removed", async () => {
    const run = vi.fn();
    const view = fixture({ features: [removal(run)] });
    await tick();
    node<HTMLButtonElement>(view.root, part("action-button")).click();
    await tick();
    view.props.value = { ...view.props.value, features: [] };
    await tick();
    await dialogButton(true);
    expect(run).not.toHaveBeenCalled();
  });
  it("keeps its real confirmation inside the table's fullscreen root", async () => {
    const state: { current: Element | null } = { current: null };
    platform(document, "fullscreenEnabled", { value: true });
    platform(document, "fullscreenElement", { get: () => state.current });
    platform(HTMLElement.prototype, "requestFullscreen", {
      value: function (this: HTMLElement) {
        state.current = this;
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      },
    });
    const run = vi.fn();
    const { root } = fixture({ features: [fullscreen(), removal(run)] });
    await tick();
    node<HTMLButtonElement>(root, part("fullscreen-toggle")).click();
    await tick();
    node<HTMLButtonElement>(root, part("action-button")).click();
    await tick();
    expect(
      node(root, part("root")).contains(node(document, ".ant-modal-confirm"))
    ).toBe(true);
    await dialogButton(false);
    expect(run).not.toHaveBeenCalled();
  });
  it("closes only its own native confirmation when the table unmounts", async () => {
    const run = vi.fn();
    const view = fixture({ features: [removal(run)] });
    await tick();
    node<HTMLButtonElement>(view.root, part("action-button")).click();
    await tick();
    const external = Modal.confirm({
      title: "Independent dialog",
      content: "Independent request",
    });
    await tick();
    expect(document.querySelectorAll(".ant-modal-confirm")).toHaveLength(2);
    view.unmount();
    await tick();
    await vi.waitFor(() =>
      expect(document.querySelectorAll(".ant-modal-confirm")).toHaveLength(1)
    );
    expect(document.body.textContent).toContain("Independent dialog");
    expect(document.body.textContent).not.toContain("Delete record");
    expect(run).not.toHaveBeenCalled();
    external.destroy();
  });
  it("cancels its native confirmation when a cached table deactivates", async () => {
    const run = vi.fn();
    const visible = ref(true);
    const { root } = mount(() =>
      h(KeepAlive, null, {
        default: () =>
          visible.value
            ? h(DataTable<Row>, {
                data: rows,
                columns: [{ key: "team" }],
                rowKey: (row) => row.id,
                urlSync: false,
                forceMobile: false,
                features: [removal(run)],
              })
            : h("span"),
      })
    );
    await tick();
    node<HTMLButtonElement>(root, part("action-button")).click();
    await tick();
    expect(document.querySelector(".ant-modal-confirm")).not.toBeNull();
    visible.value = false;
    await tick();
    await vi.waitFor(() => {
      finishMotion();
      expect(document.querySelector(".ant-modal-confirm")).toBeNull();
    });
    expect(run).not.toHaveBeenCalled();
    visible.value = true;
    await tick();
    expect(root.querySelector(".ant-modal-confirm")).toBeNull();
    expect(root.querySelector(part("action-button"))).not.toBeNull();
  });
});
