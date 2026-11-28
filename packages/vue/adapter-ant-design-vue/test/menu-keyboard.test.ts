import { describe, expect, it, vi } from "vitest";
import { h, nextTick } from "vue";

import DataTable from "../src/DataTable.vue";
import { filters } from "../src/filters";
import { rowActions } from "../src/row-actions";
import { mount, node } from "./mount";

interface Row {
  id: string;
  team: string;
}
const rows: readonly Row[] = [{ id: "a", team: "Core" }];
const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function tick() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 40));
  await nextTick();
}
function key(target: Element, value: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent("keydown", {
    key: value,
    keyCode: value === "Escape" ? 27 : undefined,
    which: value === "Escape" ? 27 : undefined,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}
const base = {
  data: rows,
  columns: [{ key: "team" }],
  rowKey: (row: Row) => row.id,
  searchable: false,
  urlSync: false,
  forceMobile: false,
};

describe("Ant Design Vue menu keyboard", () => {
  it("opens the row menu from the keyboard, moves through it and returns focus on Escape", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        rowActionsLayout: "menu",
        features: [
          rowActions<Row>([
            { key: "one", label: "First", onClick: first },
            { key: "two", label: "Second", onClick: second },
          ]),
        ],
      })
    );
    await tick();
    const trigger = node<HTMLButtonElement>(root, part("row-actions-trigger"));
    trigger.focus();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    key(trigger, "ArrowDown");
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const items = [...root.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    expect(items).toHaveLength(2);
    expect(document.activeElement).toBe(items[0]);
    key(items[0]!, "ArrowDown");
    expect(document.activeElement).toBe(items[1]);
    key(items[1]!, "ArrowDown");
    expect(document.activeElement).toBe(items[0]);
    key(items[0]!, "ArrowUp");
    expect(document.activeElement).toBe(items[1]);
    key(items[1]!, "Home");
    expect(document.activeElement).toBe(items[0]);
    key(items[0]!, "End");
    expect(document.activeElement).toBe(items[1]);
    key(items[1]!, "Escape");
    await tick();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });

  it("holds Tab inside a modal filter drawer", async () => {
    const { root } = mount(() =>
      h(DataTable<Row>, {
        ...base,
        features: [
          filters<Row>([{ key: "team", type: "text" }], { mode: "drawer" }),
        ],
      })
    );
    await tick();
    node<HTMLButtonElement>(root, part("filters-button")).click();
    await tick();
    const panel = node<HTMLElement>(document, part("filters-panel"));
    const tabbable = [
      ...panel.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled])"
      ),
    ];
    expect(tabbable.length).toBeGreaterThan(1);
    const first = tabbable[0]!;
    const last = tabbable[tabbable.length - 1]!;
    last.focus();
    const forward = key(last, "Tab");
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
    const backward = key(first, "Tab", { shiftKey: true });
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });
});
