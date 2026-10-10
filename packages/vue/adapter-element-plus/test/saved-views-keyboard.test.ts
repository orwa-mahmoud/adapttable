import { expect, it, vi } from "vitest";
import { h, nextTick } from "vue";

import { SavedViewsPanel } from "../src/saved-views";
import { mount, node } from "./mount";

async function tick() {
  await nextTick();
  await nextTick();
}

it("renders default badges and footer, and cancels rename without applying its draft", async () => {
  const apply = vi.fn();
  const rename = vi.fn();
  const outerKey = vi.fn();
  const { root } = mount(() =>
    h("section", { onKeydown: outerKey }, [
      h(SavedViewsPanel, {
        views: [{ name: "First", search: "", isDefault: true }],
        onApply: apply,
        onRename: rename,
        onMove: vi.fn(),
        onSetDefault: vi.fn(),
        onRemove: vi.fn(),
        footer: h("p", "Saved on this device"),
      }),
    ])
  );
  await tick();
  const badge = node(root, '[data-adapttable-part="saved-view-default"]');
  expect(badge.classList.contains("el-tag")).toBe(true);
  expect(badge.textContent).toContain("Default");
  expect(
    node(root, '[data-adapttable-part="saved-views-footer"]').textContent
  ).toBe("Saved on this device");
  node<HTMLButtonElement>(root, 'button[title="Rename view"]').click();
  await tick();
  const input = node<HTMLInputElement>(root, "input");
  expect(document.activeElement).toBe(input);
  input.value = "Uncommitted";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await tick();
  for (const key of ["Enter", "Escape"]) {
    const event = new KeyboardEvent("keydown", {
      key,
      isComposing: true,
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(event);
    await tick();
    expect(event.defaultPrevented).toBe(false);
    expect(input.isConnected).toBe(true);
  }
  const ordinary = new KeyboardEvent("keydown", {
    key: "ArrowLeft",
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(ordinary);
  expect(ordinary.defaultPrevented).toBe(false);
  outerKey.mockClear();
  const escape = new KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(escape);
  await tick();
  expect(escape.defaultPrevented).toBe(true);
  expect(outerKey).not.toHaveBeenCalled();
  expect(root.querySelector("input")).toBeNull();
  expect(rename).not.toHaveBeenCalled();
  expect(apply).not.toHaveBeenCalled();
  node<HTMLButtonElement>(root, 'button[title="Apply view"]').click();
  expect(apply).toHaveBeenCalledExactlyOnceWith("First");
});

it("shows an empty native card when no saved views exist", () => {
  const { root } = mount(() =>
    h(SavedViewsPanel, {
      views: [],
      onApply: vi.fn(),
      onRename: vi.fn(),
      onMove: vi.fn(),
      onSetDefault: vi.fn(),
      onRemove: vi.fn(),
    })
  );
  expect(root.querySelector(".el-card p")?.textContent).toBeTruthy();
  expect(
    root.querySelector('[data-adapttable-part="saved-view-row"]')
  ).toBeNull();
});
