import type { DataTableProps } from "@adapttable/vue/adapter";
import { describe, expect, it, vi } from "vitest";
import { h, nextTick, shallowRef } from "vue";

import DataTable from "../src/DataTable.vue";
import { findInTable } from "../src/find-in-table";
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
  await nextTick();
}
async function key(
  target: HTMLElement,
  value: string,
  extra: KeyboardEventInit = {}
) {
  const event = new KeyboardEvent("keydown", {
    key: value,
    bubbles: true,
    cancelable: true,
    ...extra,
  });
  target.dispatchEvent(event);
  await tick();
  return event;
}
async function search(input: HTMLInputElement, query: string) {
  input.value = query;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
}
function fixture(extra: Partial<DataTableProps<Row>> = {}) {
  const props = shallowRef<DataTableProps<Row>>({
    data,
    columns: [{ key: "name" }],
    rowKey: (row) => row.id,
    urlSync: false,
    searchable: false,
    forceMobile: false,
    features: [findInTable({ button: true })],
    classNames: {
      findInput: "host-find-input",
      findButton: "host-find-button",
      findBar: "host-find-bar",
    },
    ...extra,
  });
  return { ...mount(() => h(DataTable<Row>, props.value)), props };
}
describe("Element Plus find-in-table", () => {
  for (const mobile of [false, true]) {
    it(`keeps native input focus through typing, walks matches and returns to the same trigger, mobile=${mobile}`, async () => {
      const { root } = fixture({ forceMobile: mobile, dir: "rtl" });
      await tick();
      const trigger = node<HTMLButtonElement>(root, part("find-button"));
      expect(trigger.classList.contains("el-button")).toBe(true);
      trigger.focus();
      trigger.click();
      await tick();
      const input = node<HTMLInputElement>(root, part("find-input"));
      expect(input.tagName).toBe("INPUT");
      expect(input.type).toBe("search");
      expect(input.getAttribute("aria-label")).toBe("Find in table");
      expect(
        input.closest(".el-input")?.classList.contains("host-find-input")
      ).toBe(true);
      expect(
        node(root, part("find-bar")).classList.contains("host-find-bar")
      ).toBe(true);
      expect(document.activeElement).toBe(input);
      for (const query of ["a", "ad", "a"]) {
        await search(input, query);
        expect(node(root, part("find-input"))).toBe(input);
        expect(document.activeElement).toBe(input);
      }
      expect(root.querySelectorAll("[data-cell-match]")).toHaveLength(2);
      expect(node(root, part("find-count")).textContent).toContain("1 of 2");
      expect((await key(input, "Enter")).defaultPrevented).toBe(true);
      expect(node(root, part("find-count")).textContent).toContain("2 of 2");
      await key(input, "Enter", { shiftKey: true });
      expect(node(root, part("find-count")).textContent).toContain("1 of 2");
      const next = node<HTMLButtonElement>(root, part("find-next"));
      expect(next.classList.contains("el-button")).toBe(true);
      expect(next.classList.contains("host-find-button")).toBe(true);
      next.click();
      await tick();
      expect(node(root, part("find-count")).textContent).toContain("2 of 2");
      await key(input, "Escape");
      expect(root.querySelector(part("find-bar"))).toBeNull();
      expect(document.activeElement).toBe(trigger);
      trigger.click();
      await tick();
      expect(document.activeElement).toBe(node(root, part("find-input")));
      node<HTMLButtonElement>(root, part("find-close")).click();
      await tick();
      expect(document.activeElement).toBe(trigger);
    });
  }
  it("scopes Ctrl+F to the activated table and leaves unrelated editable fields alone", async () => {
    const first = fixture({ features: [findInTable()] });
    const second = fixture({ features: [findInTable()] });
    await tick();
    node<HTMLElement>(second.root, "tbody td").dispatchEvent(
      new Event("pointerdown", { bubbles: true })
    );
    expect(
      (await key(document.body, "f", { ctrlKey: true })).defaultPrevented
    ).toBe(true);
    expect(first.root.querySelector(part("find-bar"))).toBeNull();
    expect(document.activeElement).toBe(node(second.root, part("find-input")));
    const other = document.createElement("input");
    document.body.append(other);
    try {
      other.focus();
      expect((await key(other, "f", { ctrlKey: true })).defaultPrevented).toBe(
        false
      );
    } finally {
      other.remove();
    }
  });
  it("disables empty result navigation and revokes feature controls when removed", async () => {
    const { root, props } = fixture();
    await tick();
    const trigger = node<HTMLButtonElement>(root, part("find-button"));
    trigger.click();
    await tick();
    const input = node<HTMLInputElement>(root, part("find-input"));
    await search(input, "missing");
    expect(node<HTMLButtonElement>(root, part("find-next")).disabled).toBe(
      true
    );
    expect(node<HTMLButtonElement>(root, part("find-previous")).disabled).toBe(
      true
    );
    expect(root.querySelectorAll("[data-cell-match]")).toHaveLength(0);
    props.value = { ...props.value, features: [] };
    await tick();
    expect(root.querySelector(part("find-bar"))).toBeNull();
    expect(root.querySelector(part("find-button"))).toBeNull();
    trigger.click();
    await key(input, "Enter");
    expect(root.querySelector(part("find-bar"))).toBeNull();
  });
  it("uses localized labels and never turns finding into a host data write", async () => {
    const changed = vi.fn();
    const { root } = fixture({
      labels: { findInTable: "ابحث", findClose: "أغلق" },
      onCellFill: changed,
    });
    await tick();
    node<HTMLButtonElement>(root, part("find-button")).click();
    await tick();
    const input = node<HTMLInputElement>(root, part("find-input"));
    expect(input.getAttribute("aria-label")).toBe("ابحث");
    await search(input, "Ada");
    expect(root.textContent).toContain("Grace");
    expect(node(root, part("find-close")).textContent).toBe("أغلق");
    expect(changed).not.toHaveBeenCalled();
  });
});
