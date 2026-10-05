import type { RowMoveMenuSlotProps } from "@adapttable/vue/adapter";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../src";
import { cellNavigation } from "../src/cell-navigation";
import { groupingPanel } from "../src/grouping-panel";
import { NativeRowMoveMenu } from "../src/reorder/NativeRowMoveMenu";
import { rowReorder } from "../src/row-reorder";
import { virtualize } from "../src/virtualize";
import { find, mountNative, part, tick, write } from "./filter-editing-helpers";
const rows = [
  { id: "a", team: "Core", amount: 4 },
  { id: "b", team: "Ops", amount: 8 },
  { id: "c", team: "Core", amount: 6 },
];
type Row = (typeof rows)[number];
const restoreDialogMethods: (() => void)[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  restoreDialogMethods.splice(0).forEach((restore) => restore());
});
function setup() {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(180);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(600);
  const moved = vi.fn();
  const data = shallowRef<readonly Row[]>(rows);
  const shown = shallowRef(true);
  const mobile = shallowRef(false);
  const table = defineComponent({
    setup: () => () =>
      h(DataTable<Row>, {
        data: data.value,
        columns: [{ key: "team", groupable: true }, { key: "amount" }],
        rowKey: (row: Row) => row.id,
        searchable: false,
        urlSync: false,
        forceMobile: mobile.value,
        classNames: {
          reorderHeader: "move-header",
          reorderCell: "move-cell",
          rowReorderHandle: "move-handle",
          rowReorderButtons: "move-buttons",
          rowReorderUp: "move-up",
          rowReorderDown: "move-down",
        },
        features: [
          cellNavigation(),
          groupingPanel<Row>(["team"]),
          virtualize({ maxHeight: 180 }),
          rowReorder<Row>(() => undefined, {
            movePolicy: "confirm",
            onGroupMove: moved,
          }),
        ],
      }),
  });
  const view = mountNative(() =>
    h(KeepAlive, null, { default: () => (shown.value ? h(table) : null) })
  );
  const open = async () => {
    const select = find<HTMLSelectElement>(
      view.host,
      `[data-row-id="a"] ${part("row-move-menu-trigger")}`
    );
    const option = [...select.options].find(
      (item) => item.value && !item.disabled
    )!;
    select.focus();
    await write(select, option.value, "change");
    return select;
  };
  return { ...view, data, shown, mobile, moved, open };
}
describe("native row-move confirmation ownership", () => {
  it("enters a labeled native alert dialog, cancels on Escape and restores its live trigger", async () => {
    const view = setup();
    await tick();
    expect(
      find(view.host, part("reorder-header")).classList.contains("move-header")
    ).toBe(true);
    expect(
      find(view.host, part("reorder-cell")).classList.contains("move-cell")
    ).toBe(true);
    expect(
      find(view.host, part("row-reorder-handle")).classList.contains(
        "move-handle"
      )
    ).toBe(true);
    expect(view.host.querySelector(part("row-reorder-controls"))).toBeNull();
    const select = await view.open();
    const dialog = find<HTMLDialogElement>(
      view.host,
      part("row-move-confirmation")
    );
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(dialog.open).toBe(true);
    expect(dialog.getAttribute("aria-describedby")).toBe(
      dialog.querySelector("p")?.id
    );
    expect(document.activeElement).toBe(find(dialog, "button:last-of-type"));
    dialog.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(view.moved).not.toHaveBeenCalled();
    dialog.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await tick();
    expect(view.host.querySelector(part("row-move-confirmation"))).toBeNull();
    expect(document.activeElement).toBe(select);
    expect(view.moved).not.toHaveBeenCalled();
    await view.open();
    find(
      view.host,
      part("row-move-confirmation") + " button:first-of-type"
    ).click();
    await tick();
    expect(view.moved).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(select);
    view.mobile.value = true;
    await tick();
    for (const [name, className] of [
      ["row-reorder-buttons", "move-buttons"],
      ["row-reorder-up", "move-up"],
      ["row-reorder-down", "move-down"],
    ]) {
      expect(find(view.host, part(name!)).classList.contains(className!)).toBe(
        true
      );
    }
  });
  it("cannot approve an old row identity after replacement or KeepAlive suspension", async () => {
    const view = setup();
    await tick();
    await view.open();
    const staleConfirm = find(
      view.host,
      part("row-move-confirmation") + " button:first-of-type"
    );
    view.data.value = rows.map((row) => ({ ...row, amount: row.amount + 1 }));
    await tick();
    expect(view.host.querySelector(part("row-move-confirmation"))).toBeNull();
    await view.open();
    const currentDialog = find(view.host, part("row-move-confirmation"));
    staleConfirm.click();
    await tick();
    expect(view.host.querySelector(part("row-move-confirmation"))).toBe(
      currentDialog
    );
    expect(view.moved).not.toHaveBeenCalled();
    const suspendedConfirm = find(
      view.host,
      part("row-move-confirmation") + " button:first-of-type"
    );
    view.shown.value = false;
    await tick();
    suspendedConfirm.click();
    expect(view.moved).not.toHaveBeenCalled();
    view.shown.value = true;
    await tick();
    expect(view.host.querySelector(part("row-move-confirmation"))).toBeNull();
    await view.open();
    find(
      view.host,
      part("row-move-confirmation") + " button:last-of-type"
    ).click();
    await tick();
    expect(view.moved).not.toHaveBeenCalled();
  });
  it("uses native cancel/close, ignores disabled destinations and retires detached controls", async () => {
    const show = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    const close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
    for (const [key, value] of [
      ["showModal", show],
      ["close", close],
    ] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(
        HTMLDialogElement.prototype,
        key
      );
      Object.defineProperty(HTMLDialogElement.prototype, key, {
        configurable: true,
        value,
      });
      restoreDialogMethods.push(() => {
        if (descriptor)
          Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
        else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
      });
    }
    const selected = vi.fn();
    const cancelled = vi.fn();
    const confirmed = vi.fn();
    const model = shallowRef<RowMoveMenuSlotProps>({
      label: "Move row",
      items: [
        {
          id: "blocked",
          label: "Unavailable",
          disabled: true,
          onSelect: selected,
        },
      ],
    });
    const view = mountNative(() => h(NativeRowMoveMenu, model.value));
    await tick();
    const trigger = find<HTMLSelectElement>(view.host, "select");
    expect(trigger.disabled).toBe(true);
    await write(trigger, "blocked", "change");
    expect(selected).not.toHaveBeenCalled();
    const confirmation = {
      title: "Move row?",
      description: "Move Core to Ops",
      confirmLabel: "Move",
      cancelLabel: "Cancel",
      onConfirm: confirmed,
      onCancel: () => {
        cancelled();
        model.value = { ...model.value, confirmation: undefined };
      },
    };
    model.value = {
      label: "Move row",
      items: [{ id: "ops", label: "Ops", disabled: false, onSelect: selected }],
      confirmation,
    };
    await tick();
    expect(show).toHaveBeenCalledOnce();
    const dialog = find<HTMLDialogElement>(view.host, "dialog");
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    escape.preventDefault();
    dialog.dispatchEvent(escape);
    expect(cancelled).not.toHaveBeenCalled();
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    await tick();
    expect(cancelled).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
    await write(trigger, "ops", "change");
    expect(selected).toHaveBeenCalledOnce();
    model.value = { ...model.value, confirmation };
    await tick();
    const stale = find(
      view.host,
      part("row-move-confirmation") + " button:first-of-type"
    );
    view.stop();
    stale.click();
    trigger.dispatchEvent(new Event("change", { bubbles: true }));
    expect(confirmed).not.toHaveBeenCalled();
    expect(selected).toHaveBeenCalledOnce();
  });
});
