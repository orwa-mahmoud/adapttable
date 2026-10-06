import type { DataTableProps } from "@adapttable/vue/adapter";
import { ElMessageBox, ID_INJECTION_KEY } from "element-plus";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, KeepAlive, nextTick, ref, shallowRef } from "vue";

import DataTable from "../src/DataTable.vue";
import { fullscreen } from "../src/fullscreen";
import { rowActions } from "../src/row-actions";
import { mount, node } from "./mount";
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
  await new Promise((resolve) => setTimeout(resolve, 0));
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
  ElMessageBox.close();
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
  const dialog = node<HTMLElement>(
    document,
    '.el-overlay-message-box[role="dialog"]'
  );
  const buttons = dialog.querySelectorAll<HTMLButtonElement>(
    ".el-message-box__btns button"
  );
  expect(buttons).toHaveLength(2);
  const button = buttons[confirm ? 1 : 0]!;
  expect(button.classList.contains("el-button")).toBe(true);
  button.click();
  await tick();
  await vi.waitFor(() =>
    expect(document.querySelector(".el-message-box")).toBeNull()
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

describe("Element Plus row actions", () => {
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
            '.el-overlay-message-box[role="dialog"]'
          ).dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Escape",
              code: "Escape",
              bubbles: true,
              cancelable: true,
            })
          );
          await tick();
          await vi.waitFor(() =>
            expect(document.querySelector(".el-message-box")).toBeNull()
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
      expect(trigger.classList.contains("el-button")).toBe(true);
      trigger.click();
      await tick();
      const menu = node<HTMLElement>(view.root, '[role="menu"]');
      expect(menu.classList.contains("el-dropdown-menu")).toBe(true);
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
        classNames: { rowAction: "host-action", addRow: "host-add" },
      });
      root.addEventListener("click", click);
      await tick();
      const open = node<HTMLButtonElement>(
        root,
        `${part("action-button")}[aria-label="Open row"]`
      );
      expect(open.classList.contains("el-button")).toBe(true);
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
    const show = vi.spyOn(ElMessageBox, "confirm");
    const run = vi.fn();
    const { root } = fixture({ features: [removal(run)], dir: "rtl" });
    await tick();
    node<HTMLButtonElement>(root, part("action-button")).click();
    await tick();
    const dialog = node<HTMLElement>(document, ".el-message-box");
    expect(dialog.textContent).toContain("Delete record");
    expect(dialog.style.direction).toBe("rtl");
    expect(show.mock.calls[0]?.[3]?.provides[ID_INJECTION_KEY]).toMatchObject({
      prefix: 4300,
    });
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
      node(root, part("root")).contains(node(document, ".el-message-box"))
    ).toBe(true);
    await dialogButton(false);
    expect(run).not.toHaveBeenCalled();
  });
  it("closes only its own native confirmation when the table unmounts", async () => {
    const show = vi.spyOn(ElMessageBox, "confirm");
    const run = vi.fn();
    const ownedSettled = vi.fn();
    const externalSettled = vi.fn();
    const view = fixture({ features: [removal(run)] });
    await tick();
    node<HTMLButtonElement>(view.root, part("action-button")).click();
    await tick();
    const owned = show.mock.results[0]?.value;
    if (!owned) throw new Error("Missing native dialog promise");
    void owned.then(ownedSettled, ownedSettled);
    const external = ElMessageBox.confirm(
      "Independent request",
      "Independent dialog"
    );
    void external.then(externalSettled, externalSettled);
    await tick();
    view.unmount();
    await tick();
    await vi.waitFor(() =>
      expect(ownedSettled).toHaveBeenCalledExactlyOnceWith("close")
    );
    expect(externalSettled).not.toHaveBeenCalled();
    expect(
      document.querySelector('[role="dialog"][aria-label="Independent dialog"]')
    ).not.toBeNull();
    expect(run).not.toHaveBeenCalled();
  });
  it("cancels its native confirmation when a cached table deactivates", async () => {
    const show = vi.spyOn(ElMessageBox, "confirm");
    const run = vi.fn();
    const settled = vi.fn();
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
    const pending = show.mock.results[0]?.value;
    if (!pending) throw new Error("Missing native dialog promise");
    void pending.then(settled, settled);
    visible.value = false;
    await tick();
    await vi.waitFor(() =>
      expect(settled).toHaveBeenCalledExactlyOnceWith("close")
    );
    expect(run).not.toHaveBeenCalled();
    visible.value = true;
    await tick();
    await vi.waitFor(() =>
      expect(root.querySelector(".el-message-box")).toBeNull()
    );
    expect(root.querySelector(part("action-button"))).not.toBeNull();
  });
});
