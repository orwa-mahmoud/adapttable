/**
 * Desktop wrapper overflow: with no maxHeight and no pinned columns the
 * wrapper Box must NOT be a scroll container while the table fits (page-scroll
 * sticky headers depend on that), and must gain `overflow-x: auto` once the
 * measured content is wider than the wrapper.
 */
import {
  createMemoryAdapter,
  defaultConfirm,
  useDataTable,
  useFrontendData,
} from "@adapttable/core";
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DesktopTable } from "./components/tables";
import type { ColumnDef } from "./index";
import { renderMui } from "./test-utils";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

/** Stub ResizeObserver (jsdom has none) and capture its re-measure callback. */
function installResizeObserver() {
  let callback: (() => void) | undefined;
  class FakeResizeObserver {
    constructor(cb: () => void) {
      callback = cb;
    }
    observe() {
      // measurement is driven by `fire`
    }
    disconnect() {
      // not needed
    }
    unobserve() {
      // not used by the hook
    }
  }
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  return { fire: () => callback?.() };
}

function Harness({ stickyTop }: Readonly<{ stickyTop?: number }>) {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: createMemoryAdapter(""),
    columns,
  });
  const table = useDataTable<Row>({ source, columns, rowKey: (r) => r.id });
  return (
    <DesktopTable
      table={table}
      rows={source.rows}
      confirm={defaultConfirm}
      getRowId={(r: Row) => r.id}
      size="medium"
      stickyHeader={stickyTop !== undefined}
      stickyTop={stickyTop}
    />
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("DesktopTable horizontal overflow (MUI)", () => {
  it("adds overflow-x:auto only once the table is wider than the wrapper", () => {
    const ro = installResizeObserver();
    const { container } = renderMui(<Harness />);
    const wrapper = container.querySelector("table")!.parentElement!;
    // Fits (jsdom widths are 0): the wrapper must stay a non-scroll container.
    expect(getComputedStyle(wrapper).overflowX).not.toBe("auto");

    Object.defineProperty(wrapper, "scrollWidth", {
      value: 900,
      configurable: true,
    });
    Object.defineProperty(wrapper, "clientWidth", {
      value: 600,
      configurable: true,
    });
    act(() => {
      ro.fire();
    });
    expect(wrapper).toHaveStyle({ overflowX: "auto" });

    // Shrinks back to fit: the re-measure removes the scroll container again.
    Object.defineProperty(wrapper, "scrollWidth", {
      value: 600,
      configurable: true,
    });
    act(() => {
      ro.fire();
    });
    expect(getComputedStyle(wrapper).overflowX).not.toBe("auto");
  });

  it("re-binds the sticky header to the box top once the table overflows", () => {
    const ro = installResizeObserver();
    const { container } = renderMui(<Harness stickyTop={120} />);
    const wrapper = container.querySelector("table")!.parentElement!;
    const th = () => container.querySelector("th")!;
    // Fitting table: the viewport offset applies.
    expect(getComputedStyle(th()).top).toBe("120px");
    Object.defineProperty(wrapper, "scrollWidth", {
      value: 900,
      configurable: true,
    });
    Object.defineProperty(wrapper, "clientWidth", {
      value: 600,
      configurable: true,
    });
    act(() => {
      ro.fire();
    });
    // The wrapper is now the scroll container: pin to ITS top, or the
    // header floats down into the rows.
    expect(getComputedStyle(th()).top).toBe("0px");
  });
});
