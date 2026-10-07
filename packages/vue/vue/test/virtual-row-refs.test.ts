import { RowPairMeasureController } from "@adapttable/core/binding";
import { afterEach, expect, it, vi } from "vitest";

import { VirtualRowRefs } from "../src/specialized/virtualRowRefs";

afterEach(() => vi.unstubAllGlobals());

function fixture() {
  const observed = new Set<Element>();
  let resized: ResizeObserverCallback | undefined;
  class Observer {
    constructor(callback: ResizeObserverCallback) {
      resized = callback;
    }
    observe(node: Element) {
      observed.add(node);
    }
    unobserve(node: Element) {
      observed.delete(node);
    }
    disconnect() {
      observed.clear();
    }
  }
  vi.stubGlobal("ResizeObserver", Observer);
  const resize = vi.fn<(index: number, size: number) => void>();
  const controller = new RowPairMeasureController(resize);
  const attach = vi.fn(
    (...args: Parameters<RowPairMeasureController["attach"]>) =>
      controller.attach(...args)
  );
  const stop = controller.connect();
  let active = true;
  let layout: "desktop" | "mobile" = "desktop";
  const refs = new VirtualRowRefs(
    attach,
    () => active,
    () => layout
  );
  const project = (keys: readonly string[], mode = layout) => {
    refs.begin();
    const result = keys.map((key, index) => ({
      row: refs.ref(mode, key, index, "row"),
      detail: refs.ref(mode, key, index, "detail"),
    }));
    refs.finish();
    return result;
  };
  const notify = (node: Element) => {
    const entry = { target: node } as ResizeObserverEntry;
    resized?.([entry], {} as ResizeObserver);
  };
  return {
    refs,
    resize,
    attach,
    observed,
    stop,
    project,
    notify,
    setActive: (value: boolean) => {
      active = value;
    },
    setLayout: (value: typeof layout) => {
      layout = value;
    },
  };
}
function node(height: number) {
  const element = document.createElement("div");
  let size = height;
  element.getBoundingClientRect = () => new DOMRect(0, 0, 100, size);
  return {
    element,
    resize: (height: number) => {
      size = height;
    },
  };
}

it("keeps both native callbacks stable through ordinary projections and real measurements", () => {
  const f = fixture();
  const first = f.project(["a"])[0]!;
  const row = node(48);
  const detail = node(140);
  first.row(row.element);
  first.detail(detail.element);
  expect(f.resize).toHaveBeenLastCalledWith(0, 188);
  f.attach.mockClear();
  for (let index = 0; index < 4; index++) {
    const next = f.project(["a"])[0]!;
    expect(next.row).toBe(first.row);
    expect(next.detail).toBe(first.detail);
  }
  expect(f.attach).not.toHaveBeenCalled();
  detail.resize(180);
  f.notify(detail.element);
  expect(f.resize).toHaveBeenLastCalledWith(0, 228);
  f.refs.dispose();
  f.stop();
});

it("honors a real detail null, reopens it and observes its later size", () => {
  const f = fixture();
  const ref = f.project(["a"])[0]!;
  const row = node(48);
  const detail = node(140);
  ref.row(row.element);
  ref.detail(detail.element);
  ref.detail(null);
  expect(f.resize).toHaveBeenLastCalledWith(0, 48);
  expect(f.observed).toEqual(new Set([row.element]));
  f.resize.mockClear();
  f.notify(detail.element);
  expect(f.resize).not.toHaveBeenCalled();
  const next = f.project(["a"])[0]!;
  expect(next.detail).toBe(ref.detail);
  next.detail(detail.element);
  expect(f.resize).toHaveBeenLastCalledWith(0, 188);
  f.refs.dispose();
  f.stop();
});

it("moves keyed native pairs safely before late old nulls and keeps unaffected owners stable", () => {
  const f = fixture();
  const old = f.project(["a", "b", "c"]);
  const a = node(48);
  const ad = node(140);
  const b = node(60);
  const bd = node(90);
  const c = node(30);
  old[0]!.row(a.element);
  old[0]!.detail(ad.element);
  old[1]!.row(b.element);
  old[1]!.detail(bd.element);
  old[2]!.row(c.element);
  const moved = f.project(["b", "a", "c"]);
  expect(moved[2]!.row).toBe(old[2]!.row);
  moved[0]!.row(b.element);
  moved[0]!.detail(bd.element);
  moved[1]!.row(a.element);
  moved[1]!.detail(ad.element);
  old[0]!.row(null);
  old[0]!.detail(null);
  old[1]!.row(null);
  old[1]!.detail(null);
  expect(f.observed).toEqual(
    new Set([a.element, ad.element, b.element, bd.element, c.element])
  );
  f.resize.mockClear();
  ad.resize(160);
  bd.resize(100);
  f.notify(ad.element);
  f.notify(bd.element);
  expect(f.resize.mock.calls).toEqual([
    [1, 208],
    [0, 160],
  ]);
  f.refs.dispose();
  expect(f.observed.size).toBe(0);
  f.stop();
});

it("retires removed windows while rejecting stale nonnull deliveries", () => {
  const f = fixture();
  const ref = f.project(["a"])[0]!;
  const row = node(48);
  const detail = node(140);
  ref.row(row.element);
  ref.detail(detail.element);
  f.project([]);
  ref.row(null);
  ref.detail(null);
  expect(f.observed.size).toBe(0);
  f.attach.mockClear();
  ref.row(row.element);
  ref.detail(detail.element);
  expect(f.attach).not.toHaveBeenCalled();
  const replacement = f.project(["a"])[0]!;
  expect(replacement.row).not.toBe(ref.row);
  replacement.row(row.element);
  ref.row(null);
  expect(f.observed.has(row.element)).toBe(true);
  f.refs.dispose();
  f.stop();
});

it("hands a position to mobile without letting desktop callbacks detach it", () => {
  const f = fixture();
  const desktop = f.project(["a"])[0]!;
  const row = node(48);
  const detail = node(140);
  const card = node(240);
  desktop.row(row.element);
  desktop.detail(detail.element);
  f.setLayout("mobile");
  const mobile = f.project(["a"])[0]!;
  mobile.row(card.element);
  desktop.row(null);
  desktop.detail(null);
  expect(f.observed).toEqual(new Set([card.element]));
  f.attach.mockClear();
  desktop.row(row.element);
  expect(f.attach).not.toHaveBeenCalled();
  card.resize(280);
  f.notify(card.element);
  expect(f.resize).toHaveBeenLastCalledWith(0, 280);
  f.refs.dispose();
  f.stop();
});

it("allows retirement while inactive and releases every attachment at final disposal", () => {
  const f = fixture();
  const ref = f.project(["a"])[0]!;
  const row = node(48);
  const detail = node(140);
  ref.row(row.element);
  ref.detail(detail.element);
  f.setActive(false);
  ref.detail(null);
  expect(f.resize).toHaveBeenLastCalledWith(0, 48);
  f.attach.mockClear();
  ref.detail(detail.element);
  expect(f.attach).not.toHaveBeenCalled();
  f.setActive(true);
  ref.detail(detail.element);
  expect(f.resize).toHaveBeenLastCalledWith(0, 188);
  f.attach.mockClear();
  f.resize.mockClear();
  f.refs.dispose();
  expect(f.attach.mock.calls).toEqual([
    [0, "row", null],
    [0, "detail", null],
  ]);
  expect(f.resize).not.toHaveBeenCalled();
  expect(f.observed.size).toBe(0);
  f.attach.mockClear();
  ref.row(row.element);
  ref.detail(detail.element);
  ref.row(null);
  ref.detail(null);
  f.refs.dispose();
  expect(f.attach).not.toHaveBeenCalled();
  f.stop();
});
