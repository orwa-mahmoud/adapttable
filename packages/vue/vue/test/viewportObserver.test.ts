/**
 * A virtualized table re-reads its geometry when something that can move or
 * resize it changes — its own content, an ancestor, the window — and only
 * then, once per frame however many changes arrive.
 */
import { afterEach, expect, it, vi } from "vitest";
import { effectScope, nextTick } from "vue";

import { virtualize } from "../src/specialized/virtualize";
import { useDataTableShell } from "../src/useDataTableShell";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

async function frame() {
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await nextTick();
}

function mount() {
  const outer = document.createElement("section");
  const root = document.createElement("div");
  const box = document.createElement("div");
  box.dataset.adapttablePart = "scroll-box";
  root.append(box);
  outer.append(root);
  const elsewhere = document.createElement("aside");
  document.body.append(outer, elsewhere);
  vi.spyOn(box, "getBoundingClientRect").mockReturnValue({
    top: 0,
    left: 0,
    right: 400,
    bottom: 200,
    width: 400,
    height: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  // Each geometry read queries the scroll box for its header controls.
  const reads = vi.spyOn(box, "querySelectorAll");
  const scope = effectScope();
  const shell = scope.run(() =>
    useDataTableShell({
      data: Array.from({ length: 200 }, (_, index) => ({ id: String(index) })),
      columns: [{ key: "id" }],
      rowKey: (row: { id: string }) => row.id,
      urlSync: false,
      defaults: { limit: 200 },
      paginationMode: "infinite",
      features: [virtualize({ maxHeight: 200 })],
    })
  )!;
  shell.setSurface({ rootElement: () => root, scrollElement: () => box });
  return { outer, root, box, elsewhere, reads, scope };
}

it("ignores changes elsewhere in the page", async () => {
  const { elsewhere, reads, scope } = mount();
  await frame();
  const before = reads.mock.calls.length;
  for (let index = 0; index < 12; index++) {
    elsewhere.className = `state-${index}`;
    await nextTick();
  }
  await frame();
  expect(reads.mock.calls).toHaveLength(before);
  scope.stop();
});

it("re-reads once per frame for changes that can move the table", async () => {
  const { outer, box, reads, scope } = mount();
  await frame();
  let before = reads.mock.calls.length;
  for (let index = 0; index < 5; index++) {
    const control = document.createElement("div");
    control.dataset.adapttablePart = "selection-header";
    box.append(control);
  }
  await frame();
  // Two queries per read: the leading and the trailing header controls.
  expect(reads.mock.calls.length - before).toBe(2);
  before = reads.mock.calls.length;
  outer.hidden = true;
  outer.hidden = false;
  outer.style.marginTop = "40px";
  await frame();
  expect(reads.mock.calls.length - before).toBe(2);
  before = reads.mock.calls.length;
  document.body.insertBefore(document.createElement("header"), outer);
  await frame();
  expect(reads.mock.calls.length - before).toBe(2);
  scope.stop();
});

it("stops reading when the table is torn down", async () => {
  const { outer, reads, scope } = mount();
  await frame();
  scope.stop();
  const before = reads.mock.calls.length;
  outer.style.marginTop = "80px";
  window.dispatchEvent(new Event("resize"));
  await frame();
  expect(reads.mock.calls).toHaveLength(before);
});
