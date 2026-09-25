/**
 * A clickable row is a control, and a row full of controls is where that gets
 * difficult: the checkbox, the actions button and the link inside it each own
 * their own click, and the row must not steal any of them. Keyboard users get
 * one Tab stop for the whole list and arrow keys to move within it, which is
 * the listbox pattern rather than a table full of tab stops.
 */
import { describe, expect, it, vi } from "vitest";

import { rowClickProps } from "./rowClickProps";

interface Row {
  id: string;
}

const ROW: Row = { id: "r1" };

function list(count: number): HTMLElement[] {
  const parent = document.createElement("div");
  const rows: HTMLElement[] = [];
  for (let index = 0; index < count; index++) {
    const el = document.createElement("div");
    el.dataset.adapttableRow = "";
    el.tabIndex = index === 0 ? 0 : -1;
    parent.append(el);
    rows.push(el);
  }
  document.body.append(parent);
  return rows;
}

function keyEvent(
  key: string,
  currentTarget: HTMLElement,
  target: EventTarget = currentTarget
) {
  return {
    key,
    target,
    currentTarget,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent & { currentTarget: HTMLElement };
}

describe("rowClickProps", () => {
  it("returns nothing when the host wired no activation", () => {
    expect(rowClickProps(ROW, undefined)).toBeUndefined();
  });

  it("makes only the first row a Tab stop when the index is known", () => {
    expect(rowClickProps(ROW, vi.fn(), 0)?.tabIndex).toBe(0);
    expect(rowClickProps(ROW, vi.fn(), 3)?.tabIndex).toBe(-1);
    // No index: nothing is roving, so every row stays reachable.
    expect(rowClickProps(ROW, vi.fn())?.tabIndex).toBe(0);
  });

  it("marks the element as a navigation stop and shows a pointer", () => {
    const props = rowClickProps(ROW, vi.fn());
    expect(props?.["data-adapttable-row"]).toBe("");
    expect(props?.style).toEqual({ cursor: "pointer" });
  });

  it("activates on a click in the row's own space", () => {
    const onRowClick = vi.fn();
    const props = rowClickProps(ROW, onRowClick);
    const cell = document.createElement("td");
    props?.onClick({ target: cell } as never);
    expect(onRowClick).toHaveBeenCalledWith(ROW);
  });

  it("leaves an interactive child's click to the child", () => {
    const onRowClick = vi.fn();
    const props = rowClickProps(ROW, onRowClick);
    for (const html of [
      "<button>Edit</button>",
      "<a href='#x'>Open</a>",
      "<input type='checkbox' />",
      "<span role='checkbox'></span>",
      "<label><span>Pick</span></label>",
    ]) {
      const holder = document.createElement("div");
      holder.innerHTML = html;
      const inner =
        holder.firstElementChild?.lastElementChild ?? holder.firstElementChild;
      props?.onClick({ target: inner } as never);
    }
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("activates on Enter and Space, and on nothing else", () => {
    const onRowClick = vi.fn();
    const props = rowClickProps(ROW, onRowClick);
    const el = document.createElement("div");
    for (const key of ["Enter", " "]) {
      const event = keyEvent(key, el);
      props?.onKeyDown(event);
      expect(event.preventDefault).toHaveBeenCalled();
    }
    expect(onRowClick).toHaveBeenCalledTimes(2);
    props?.onKeyDown(keyEvent("x", el));
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it("ignores a key pressed inside a child control", () => {
    const onRowClick = vi.fn();
    const props = rowClickProps(ROW, onRowClick);
    const el = document.createElement("div");
    const button = document.createElement("button");
    props?.onKeyDown(keyEvent("Enter", el, button));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("moves focus and the tab stop with the arrow keys", () => {
    const rows = list(3);
    const props = rowClickProps(ROW, vi.fn(), 0);
    props?.onKeyDown(keyEvent("ArrowDown", rows[0]!));
    expect(document.activeElement).toBe(rows[1]);
    expect(rows[0]?.tabIndex).toBe(-1);
    expect(rows[1]?.tabIndex).toBe(0);

    props?.onKeyDown(keyEvent("ArrowUp", rows[1]!));
    expect(document.activeElement).toBe(rows[0]);
    expect(rows[0]?.tabIndex).toBe(0);
  });

  it("stops at the ends rather than wrapping around", () => {
    const rows = list(2);
    const props = rowClickProps(ROW, vi.fn(), 0);
    rows[0]?.focus();
    props?.onKeyDown(keyEvent("ArrowUp", rows[0]!));
    expect(document.activeElement).toBe(rows[0]);
    rows[1]?.focus();
    props?.onKeyDown(keyEvent("ArrowDown", rows[1]!));
    expect(document.activeElement).toBe(rows[1]);
  });

  it("does nothing for a row with no parent to walk", () => {
    const orphan = document.createElement("div");
    const props = rowClickProps(ROW, vi.fn(), 0);
    expect(() => props?.onKeyDown(keyEvent("ArrowDown", orphan))).not.toThrow();
  });
});
