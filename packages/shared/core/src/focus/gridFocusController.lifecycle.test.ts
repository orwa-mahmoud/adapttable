import { afterEach, expect, it, vi } from "vitest";

import {
  createGridFocusController,
  type GridFocusControllerOptions,
} from "./gridFocusController";
interface Row {
  id: string;
  name: string;
}
const rows: readonly Row[] = [{ id: "a", name: "Ada" }];
const base: GridFocusControllerOptions<Row> = {
  enabled: true,
  rows,
  columns: [{ key: "name", editable: true }],
  rowCount: 1,
  getRowId: (row) => row.id,
};
function deferred<T>() {
  let complete: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    complete = resolve;
  });
  return { promise, resolve: (value: T) => complete?.(value) };
}
const range = { anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } };
function key() {
  return { key: "v", ctrlKey: true, preventDefault: vi.fn() };
}
async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
afterEach(() => vi.restoreAllMocks());
for (const change of ["rows", "disable", "window", "columns"] as const)
  it(`drops pending paste after ${change} changes its destination`, async () => {
    const pending = deferred<string>();
    Object.assign(navigator, {
      clipboard: { readText: () => pending.promise },
    });
    const onPaste = vi.fn();
    const controller = createGridFocusController({ ...base, onPaste });
    controller.keyDown(key());
    const changes = {
      rows: { rows: [{ id: "b", name: "Bea" }] },
      disable: { enabled: false },
      window: { firstRowIndex: 10 },
      columns: { columns: [{ key: "other", editable: true }] },
    };
    controller.configure({
      ...base,
      onPaste,
      ...changes[change],
    });
    pending.resolve("changed");
    await settle();
    expect(onPaste).not.toHaveBeenCalled();
  });
it("preserves a pending paste through equivalent rerenders and uses the latest callback", async () => {
  const pending = deferred<string>();
  Object.assign(navigator, { clipboard: { readText: () => pending.promise } });
  const first = vi.fn();
  const next = vi.fn();
  const controller = createGridFocusController({ ...base, onPaste: first });
  controller.keyDown(key());
  controller.configure({
    ...base,
    rows: [...rows],
    columns: base.columns.map((column) => ({ ...column, header: "Renamed" })),
    onPaste: next,
  });
  pending.resolve("changed");
  await settle();
  expect(first).not.toHaveBeenCalled();
  expect(next).toHaveBeenCalledWith([
    { row: rows[0], columnKey: "name", value: "changed" },
  ]);
});
it("does not revive an async cut after a disable and reconnect", async () => {
  const pending = deferred<void>();
  Object.assign(navigator, { clipboard: { writeText: () => pending.promise } });
  const onCut = vi.fn();
  const controller = createGridFocusController({ ...base, onCut });
  controller.selectRange(range);
  controller.copyCells(undefined, true);
  controller.configure({ ...base, enabled: false, onCut });
  controller.configure({ ...base, onCut });
  pending.resolve();
  await settle();
  expect(onCut).not.toHaveBeenCalled();
});
it("drops an async cut when the original row object is replaced", async () => {
  const pending = deferred<void>();
  Object.assign(navigator, { clipboard: { writeText: () => pending.promise } });
  const onCut = vi.fn();
  const controller = createGridFocusController({ ...base, onCut });
  controller.selectRange(range);
  controller.copyCells(undefined, true);
  controller.configure({
    ...base,
    rows: [{ id: "a", name: "new version" }],
    onCut,
  });
  pending.resolve();
  await settle();
  expect(onCut).not.toHaveBeenCalled();
});
it("preserves a cut across equivalent configure and delivers its latest callback", async () => {
  const pending = deferred<void>();
  Object.assign(navigator, { clipboard: { writeText: () => pending.promise } });
  const first = vi.fn();
  const next = vi.fn();
  const controller = createGridFocusController({ ...base, onCut: first });
  controller.selectRange(range);
  controller.copyCells(undefined, true);
  controller.configure({ ...base, rows: [...rows], onCut: next });
  pending.resolve();
  await settle();
  expect(first).not.toHaveBeenCalled();
  expect(next).toHaveBeenCalledWith(range);
});
it("detects replacement in the same row array without notifying during configure", async () => {
  const pending = deferred<string>();
  Object.assign(navigator, { clipboard: { readText: () => pending.promise } });
  const mutableRows = [...rows];
  const onPaste = vi.fn();
  const controller = createGridFocusController({
    ...base,
    rows: mutableRows,
    onPaste,
  });
  const listener = vi.fn();
  controller.subscribe(listener);
  controller.keyDown(key());
  listener.mockClear();
  mutableRows[0] = { id: "replacement", name: "New" };
  controller.configure({ ...base, rows: mutableRows, onPaste });
  expect(listener).not.toHaveBeenCalled();
  pending.resolve("stale");
  await settle();
  expect(onPaste).not.toHaveBeenCalled();
});
it("detects same-array reordering for a pending cut", async () => {
  const pending = deferred<void>();
  Object.assign(navigator, { clipboard: { writeText: () => pending.promise } });
  const mutableRows = [...rows, { id: "b", name: "Bea" }];
  const onCut = vi.fn();
  const controller = createGridFocusController({
    ...base,
    rows: mutableRows,
    onCut,
  });
  controller.selectRange(range);
  controller.copyCells(undefined, true);
  mutableRows.reverse();
  controller.configure({ ...base, rows: mutableRows, onCut });
  pending.resolve();
  await settle();
  expect(onCut).not.toHaveBeenCalled();
});
it("detects same-object column replacement but accepts an explicit zero window offset", async () => {
  const pending = deferred<string>();
  Object.assign(navigator, { clipboard: { readText: () => pending.promise } });
  const columns = [{ key: "name", editable: true }];
  const onPaste = vi.fn();
  const controller = createGridFocusController({ ...base, columns, onPaste });
  controller.keyDown(key());
  controller.configure({ ...base, columns, onPaste, firstRowIndex: 0 });
  pending.resolve("ok");
  await settle();
  expect(onPaste).toHaveBeenCalledTimes(1);
  const later = deferred<string>();
  Object.assign(navigator, { clipboard: { readText: () => later.promise } });
  controller.keyDown(key());
  columns[0]!.key = "changed";
  controller.configure({ ...base, columns, onPaste });
  later.resolve("stale");
  await settle();
  expect(onPaste).toHaveBeenCalledTimes(1);
});
it("cancels pointer gestures across a suspended lifetime without render notifications", () => {
  const onFill = vi.fn();
  const config = { ...base, rows: [...rows, { id: "b", name: "Bea" }], onFill };
  const controller = createGridFocusController(config);
  controller.selectRange(range);
  controller.pressFillHandle({
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  });
  controller.enterCell({ row: 1, col: 0 });
  expect(controller.getSnapshot().fillPreview).not.toBeNull();
  const listener = vi.fn();
  controller.subscribe(listener);
  controller.configure({ ...config, enabled: false });
  controller.configure(config);
  expect(listener).not.toHaveBeenCalled();
  controller.releasePointer();
  controller.syncFocus();
  expect(onFill).not.toHaveBeenCalled();
  expect(controller.getSnapshot().fillPreview).toBeNull();
  controller.pressCell({ row: 0, col: 0 }, {});
  controller.configure({ ...config, enabled: false });
  controller.configure(config);
  controller.enterCell({ row: 1, col: 0 });
  expect(controller.getSnapshot().range).toEqual(range);
});
it("preserves deliberate pending off-window focus across equivalent configure", () => {
  const controller = createGridFocusController(base);
  controller.focusCell({ row: 100, col: 0 });
  const listener = vi.fn();
  controller.subscribe(listener);
  controller.configure({ ...base, rows: [...rows] });
  expect(listener).not.toHaveBeenCalled();
  expect(controller.getSnapshot().active).toEqual({ row: 100, col: 0 });
});

it("detects an in-place row-key replacement when the host supplies identity", async () => {
  const pending = deferred<string>();
  Object.assign(navigator, { clipboard: { readText: () => pending.promise } });
  const row = { id: "original", name: "Ada" };
  const localRows = [row];
  const onPaste = vi.fn();
  const controller = createGridFocusController({
    ...base,
    rows: localRows,
    onPaste,
  });
  controller.keyDown(key());
  row.id = "replacement";
  controller.configure({ ...base, rows: localRows, onPaste });
  pending.resolve("stale");
  await settle();
  expect(onPaste).not.toHaveBeenCalled();
});
it("snapshots scalar identity when the same configuration object is mutated", async () => {
  const pending = deferred<string>();
  Object.assign(navigator, { clipboard: { readText: () => pending.promise } });
  const onPaste = vi.fn();
  const config = { ...base, onPaste, firstRowIndex: 0 };
  const controller = createGridFocusController(config);
  controller.keyDown(key());
  config.firstRowIndex = 20;
  controller.configure(config);
  pending.resolve("stale");
  await settle();
  expect(onPaste).not.toHaveBeenCalled();
  const copied = deferred<void>();
  Object.assign(navigator, { clipboard: { writeText: () => copied.promise } });
  const onCut = vi.fn();
  const cutConfig = { ...base, onCut };
  const cut = createGridFocusController(cutConfig);
  cut.selectRange(range);
  cut.copyCells(undefined, true);
  cutConfig.enabled = false;
  cut.configure(cutConfig);
  cutConfig.enabled = true;
  cut.configure(cutConfig);
  copied.resolve();
  await settle();
  expect(onCut).not.toHaveBeenCalled();
});
