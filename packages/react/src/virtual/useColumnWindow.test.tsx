/**
 * Windowing the horizontal axis.
 *
 * A table with five hundred columns has the same problem a long one has, and
 * row windowing does nothing for it. These cover which columns survive the
 * window, what holds the rest open, and the two things that make it safe:
 * pinned columns are never windowed out, and the spacers are logical.
 */
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import { type ColumnWindow, useColumnWindow } from "./useColumnWindow";

interface Row {
  id: string;
}
const COLUMNS: ColumnDef<Row>[] = Array.from({ length: 20 }, (_, i) => ({
  key: `c${i}`,
  header: `C${i}`,
}));
const WIDTHS = Object.fromEntries(COLUMNS.map((c) => [c.key, 100]));

/** A scroll box the hook can read, with a scroll position under test control. */
function Harness({
  scrollLeft,
  clientWidth = 400,
  onWindow,
  ...options
}: Readonly<{
  scrollLeft: number;
  clientWidth?: number;
  enabled?: boolean;
  pinnedKeys?: ReadonlySet<string>;
  onWindow: (window: ColumnWindow<Row>) => void;
}>) {
  // A real element, because the hook listens to it: jsdom reports zero for
  // every measurement, so the two the hook reads are defined here.
  const element = document.createElement("div");
  Object.defineProperty(element, "clientWidth", { value: clientWidth });
  element.scrollLeft = scrollLeft;
  const result = useColumnWindow<Row>({
    columns: COLUMNS,
    widths: WIDTHS,
    enabled: options.enabled ?? true,
    pinnedKeys: options.pinnedKeys,
    getScrollElement: () => element,
  });
  onWindow(result);
  return null;
}

const windowAt = (
  scrollLeft: number,
  extra: Partial<Parameters<typeof Harness>[0]> = {}
): ColumnWindow<Row> => {
  let captured!: ColumnWindow<Row>;
  act(() => {
    render(
      <Harness
        scrollLeft={scrollLeft}
        onWindow={(w) => {
          captured = w;
        }}
        {...extra}
      />
    );
  });
  return captured;
};

describe("useColumnWindow", () => {
  it("renders every column when it is off", () => {
    const window = windowAt(0, { enabled: false });
    expect(window.enabled).toBe(false);
    expect(window.columns).toHaveLength(20);
    expect(window.paddingStart).toBe(0);
  });

  it("keeps the columns the viewport crosses, plus an overscan", () => {
    const window = windowAt(0);
    // 400px of 100px columns is four, plus three either side.
    expect(window.columns.length).toBeLessThan(20);
    expect(window.columns[0]?.key).toBe("c0");
  });

  it("holds the columns before the window open with a spacer", () => {
    const window = windowAt(1000);
    expect(window.paddingStart).toBeGreaterThan(0);
    expect(window.paddingEnd).toBeGreaterThan(0);
    // The spacers plus the rendered columns still add up to the full width.
    const rendered = window.columns.length * 100;
    expect(window.paddingStart + rendered + window.paddingEnd).toBe(2000);
  });

  it("never windows out a pinned column", () => {
    // A pinned column is on screen whatever the scroll position; dropping it
    // because the viewport moved past its place in the order would be wrong.
    const window = windowAt(1500, { pinnedKeys: new Set(["c0"]) });
    expect(window.columns[0]?.key).toBe("c0");
    expect(window.columns.some((column) => column.key === "c17")).toBe(true);
  });

  it("reads the distance scrolled, whichever way the page reads", () => {
    // RTL engines report a negative scrollLeft; the magnitude is the distance.
    expect(windowAt(-1000).columns.map((c) => c.key)).toEqual(
      windowAt(1000).columns.map((c) => c.key)
    );
  });

  it("shows the head of the table when the scroll is past everything", () => {
    const window = windowAt(99_999);
    expect(window.columns[0]?.key).toBe("c0");
    expect(window.columns.length).toBeGreaterThan(0);
  });
});
