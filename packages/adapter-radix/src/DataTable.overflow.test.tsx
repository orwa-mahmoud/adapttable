/**
 * Horizontal-overflow behaviour of the desktop table wrapper. With no
 * maxHeight and no pinned columns the wrapper must stay a NON-scroll
 * container (page-scroll sticky headers depend on that), gaining
 * `overflow-x: auto` only once the table is measured wider than the card —
 * otherwise wide tables bleed past the card border.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { Theme } from "@radix-ui/themes";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
  city: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai" },
  { id: "b", name: "Bob", city: "Riyadh" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "city", header: "City", accessor: (r) => r.city },
];

interface ObserverInstance {
  measure: () => void;
  observed: Element[];
}

/**
 * jsdom ships no ResizeObserver (core's useHorizontalOverflow then stays
 * `false`), so install a fake that records each observer's callback and
 * targets and lets the test re-fire the measurement after mutating
 * scrollWidth/clientWidth — scoped per observed element so only the wrapper's
 * observer is re-fired.
 */
function installResizeObserver() {
  const instances: ObserverInstance[] = [];
  class FakeResizeObserver {
    private readonly instance: ObserverInstance;
    constructor(measure: () => void) {
      this.instance = { measure, observed: [] };
      instances.push(this.instance);
    }
    observe(el: Element): void {
      this.instance.observed.push(el);
    }
    disconnect(): void {
      this.instance.observed.length = 0;
    }
    unobserve(): void {
      // not used by the hook
    }
  }
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  return {
    fireFor(target: Element): void {
      for (const { measure, observed } of instances) {
        if (observed.includes(target)) measure();
      }
    },
  };
}

/**
 * Desktop table with stickyHeader, NO maxHeight and NO pinned columns —
 * exactly the configuration whose wrapper must not become a scroll
 * container while the table fits. Returns the wrapper Box around the table.
 */
function renderTable(stickyTop?: number): HTMLElement {
  const adapter = createMemoryAdapter("");
  function Harness() {
    const source = useFrontendData<Row>({
      data: ROWS,
      urlAdapter: adapter,
      columns,
      paginationMode: "paged",
    });
    return (
      <DataTable
        source={source}
        columns={columns}
        rowKey={(r) => r.id}
        stickyHeader
        stickyTop={stickyTop}
      />
    );
  }
  const { container } = render(
    <Theme>
      <Harness />
    </Theme>
  );
  // The wrapper Box is the `overflowRef` parent of the Radix Table.Root.
  return container.querySelector("table")!.closest(".rt-TableRoot")!
    .parentElement!;
}

function setWidths(el: Element, scrollWidth: number, clientWidth: number) {
  Object.defineProperty(el, "scrollWidth", {
    value: scrollWidth,
    configurable: true,
  });
  Object.defineProperty(el, "clientWidth", {
    value: clientWidth,
    configurable: true,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("desktop wrapper horizontal overflow (no maxHeight, no pins)", () => {
  it("stays a non-scroll container while the table fits, keeping sticky headers", () => {
    installResizeObserver();
    const wrapper = renderTable();
    // jsdom measures 0/0 → content fits → overflow-x stays unset, so the
    // wrapper is no scroll container and page-scroll sticky keeps working.
    expect(getComputedStyle(wrapper).overflowX).not.toBe("auto");
    expect(getComputedStyle(wrapper.querySelector("th")!).position).toBe(
      "sticky"
    );
  });

  it("re-binds the sticky header to the box top once the table overflows", () => {
    const ro = installResizeObserver();
    const wrapper = renderTable(120);
    const th = wrapper.querySelector("th")!;
    // Fitting table: viewport offset applies (resolved >= the passed 120).
    expect(
      Number.parseInt(getComputedStyle(th).top, 10)
    ).toBeGreaterThanOrEqual(120);
    setWidths(wrapper, 900, 600);
    act(() => {
      ro.fireFor(wrapper);
    });
    // The wrapper is now the scroll container: pin to ITS top, or the
    // header floats down into the rows.
    expect(getComputedStyle(wrapper.querySelector("th")!).top).toBe("0px");
  });

  it("gains overflow-x auto once the table measures wider than the wrapper", () => {
    const ro = installResizeObserver();
    const wrapper = renderTable();
    expect(getComputedStyle(wrapper).overflowX).not.toBe("auto");
    setWidths(wrapper, 900, 600);
    act(() => {
      ro.fireFor(wrapper);
    });
    expect(getComputedStyle(wrapper).overflowX).toBe("auto");
  });
});

describe("column-pin sticky fix (Radix ScrollArea workaround)", () => {
  it("restores the inner table's overflow and pushes the fixed-column min-width onto it", () => {
    installResizeObserver();
    const adapter = createMemoryAdapter("");
    // Fixed-width columns give the table a real min-width to overflow with.
    const wideCols: ColumnDef<Row>[] = [
      { key: "name", header: "Name", accessor: (r) => r.name, width: "300px" },
      { key: "city", header: "City", accessor: (r) => r.city, width: "300px" },
    ];
    function Harness() {
      const source = useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        columns: wideCols,
        paginationMode: "paged",
      });
      return (
        <DataTable
          source={source}
          columns={wideCols}
          rowKey={(r) => r.id}
          defaultColumnLayout={{ pinned: { name: "start" } }}
        />
      );
    }
    const { container } = render(
      <Theme>
        <Harness />
      </Theme>
    );
    const wrapper = container
      .querySelector("table")!
      .closest(".rt-TableRoot")!.parentElement!;
    // The wrapper scopes the override and ships the rule that beats Radix's
    // `surface` overflow:hidden and gives the inner <table> its min-width.
    expect(wrapper.classList.contains("adapttable-radix-scroll")).toBe(true);
    const rule = wrapper.querySelector("style")!.textContent ?? "";
    expect(rule).toContain(".rt-TableRootTable{overflow:visible");
    expect(rule).toContain("min-width:var(--adapttable-min-width");
    // The fixed-column min-width is fed in as the custom property the rule
    // reads, so the table (not Radix's ScrollArea viewport) is what overflows —
    // which is what lets the pinned/edge sticky cells stick.
    expect(wrapper.style.getPropertyValue("--adapttable-min-width")).toMatch(
      /^\d+px$/
    );
    // Radix's Table.Root must NOT carry an inline min-width that would keep the
    // viewport (and not the table) as the thing that overflows.
    const root = wrapper.querySelector<HTMLElement>(".rt-TableRoot")!;
    expect(root.style.minWidth).toBe("");
  });
});
