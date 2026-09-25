/**
 * The table conformance suite: the behaviour every binding and every kit
 * must show, asserted once, against the DOM.
 *
 * A kit is done when it passes this suite. The assertions query what a
 * reader and a host can rely on — roles, accessible names, the
 * `data-adapttable-part` names and the row identity attributes — and never a
 * kit's own markup, so the same suite runs against React, Vue or Angular.
 *
 * The suite depends on no test runner and no framework. The caller hands
 * {@link tableConformanceTests} two things and registers what comes back:
 *
 * - a {@link ConformanceDriver}: `mount(scenario) → { container, unmount }`,
 *   which renders the binding's table for a {@link ConformanceScenario};
 * - a {@link ConformanceHarness}: the test runner's `expect`, and DOM
 *   Testing Library's `fireEvent` and `waitFor`.
 *
 * A React kit's driver renders its `<DataTable>`:
 *
 * ```tsx
 * import { fireEvent, render, waitFor } from "@testing-library/react";
 * import { describe, expect, it } from "vitest";
 *
 * const driver = {
 *   name: "mui",
 *   mount: (scenario) => render(<Table scenario={scenario} />),
 * };
 *
 * describe("table conformance — mui", () => {
 *   for (const test of tableConformanceTests(driver, {
 *     expect,
 *     fireEvent,
 *     waitFor,
 *   })) {
 *     it(test.name, test.run);
 *   }
 * });
 * ```
 *
 * A Vue or Angular binding plugs in the same way: its driver calls
 * `@testing-library/vue`'s or `@testing-library/angular`'s `render` with the
 * binding's table component, translating the scenario into that component's
 * props — `rows` into the binding's frontend data source, `columns` into its
 * column definitions, `selectable` into its selection feature — and returns
 * the container and the unmount. Nothing in the suite changes.
 */
import { defaultLabels } from "../labels";

/**
 * One row of the scenario data.
 *
 * @public
 */
export interface ConformanceRow {
  /** Stable id — the row key. */
  readonly id: string;
  /** A text column. */
  readonly name: string;
  /** A numeric column. */
  readonly age: number;
}

/**
 * One column of the scenario.
 *
 * @public
 */
export interface ConformanceColumn {
  /** The row field this column reads. */
  readonly key: "name" | "age";
  /** The header caption. */
  readonly header: string;
  /** Whether the column sorts. */
  readonly sortable?: boolean;
}

/**
 * What a driver renders: frontend data, plain columns, and the switches the
 * suite exercises.
 *
 * @public
 */
export interface ConformanceScenario {
  /** The rows, in data order. */
  readonly rows: readonly ConformanceRow[];
  /** The columns, in order. */
  readonly columns: readonly ConformanceColumn[];
  /** The table's accessible name. */
  readonly tableLabel: string;
  /** Writing direction. Omit for left-to-right. */
  readonly dir?: "ltr" | "rtl";
  /** Render the phone layout. */
  readonly mobile?: boolean;
  /** Compose row selection. */
  readonly selectable?: boolean;
}

/**
 * A mounted table.
 *
 * @public
 */
export interface ConformanceMount {
  /** The element the table rendered into. */
  readonly container: HTMLElement;
  /** Remove the table. */
  readonly unmount: () => void;
}

/**
 * Renders a binding's table for a scenario.
 *
 * @public
 */
export interface ConformanceDriver {
  /** The binding or kit under test, for the suite's name. */
  readonly name: string;
  /** Render the table for a scenario. */
  readonly mount: (scenario: ConformanceScenario) => ConformanceMount;
}

/**
 * The assertions the suite makes.
 *
 * @public
 */
export interface ConformanceExpectation {
  /** Strict equality. */
  toBe(expected: unknown): void;
  /** Deep equality. */
  toEqual(expected: unknown): void;
  /** The value is `null`. */
  toBeNull(): void;
  /** The negated assertions. */
  readonly not: {
    /** The value is not `null`. */
    toBeNull(): void;
  };
}

/**
 * The test runner and DOM Testing Library functions the suite runs with.
 *
 * @public
 */
export interface ConformanceHarness {
  /** Start an assertion. */
  readonly expect: (actual: unknown) => ConformanceExpectation;
  /** Dispatch DOM events. */
  readonly fireEvent: { readonly click: (element: Element) => unknown };
  /** Retry a callback until it stops throwing. */
  readonly waitFor: <T>(callback: () => T) => Promise<T>;
}

/**
 * One conformance test: what it asserts, and the body a runner calls.
 *
 * @public
 */
export interface ConformanceTest {
  /** What the test asserts, as a runner names it. */
  readonly name: string;
  /** Mount, assert and unmount. */
  readonly run: () => Promise<void>;
}

/**
 * The scenario data: three rows whose name order and age order differ, so a
 * sort is visible.
 *
 * @public
 */
export const CONFORMANCE_ROWS: readonly ConformanceRow[] = [
  { id: "r1", name: "Ada", age: 36 },
  { id: "r2", name: "Grace", age: 28 },
  { id: "r3", name: "Linus", age: 54 },
];

/**
 * The scenario columns: a text column and a sortable numeric one.
 *
 * @public
 */
export const CONFORMANCE_COLUMNS: readonly ConformanceColumn[] = [
  { key: "name", header: "Name" },
  { key: "age", header: "Age", sortable: true },
];

const BASE: ConformanceScenario = {
  rows: CONFORMANCE_ROWS,
  columns: CONFORMANCE_COLUMNS,
  tableLabel: "People",
};

function part(root: ParentNode, name: string): Element | null {
  return root.querySelector(`[data-adapttable-part="${name}"]`);
}

function parts(root: ParentNode, name: string): Element[] {
  return [...root.querySelectorAll(`[data-adapttable-part="${name}"]`)];
}

function rowIds(root: ParentNode): (string | null)[] {
  return parts(root, "row").map((row) => row.getAttribute("data-row-id"));
}

function headerFor(root: ParentNode, key: string): Element | null {
  return (
    parts(root, "header-cell").find(
      (cell) => cell.getAttribute("data-column-key") === key
    ) ?? null
  );
}

/**
 * What a reader activates to sort a header: its button, or the header cell
 * itself in a kit whose header cell is the control.
 */
function sortControlOf(header: Element | null): Element | null {
  if (!header) return null;
  return header.querySelector('button, [role="button"]') ?? header;
}

/**
 * The element carrying a header's `aria-sort`: the header cell, or the
 * nearest element inside it that announces the sort.
 */
function ariaSortOf(header: Element | null): string | null {
  if (!header) return null;
  if (header.hasAttribute("aria-sort")) return header.getAttribute("aria-sort");
  const inner = header.querySelector("[aria-sort]");
  return inner ? inner.getAttribute("aria-sort") : null;
}

/**
 * The conformance tests for one driver, for the caller's runner to register.
 *
 * @param driver - Renders the binding's table.
 * @param harness - The runner's `expect` and DOM Testing Library functions.
 * @returns The tests, in order.
 *
 * @public
 */
export function tableConformanceTests(
  driver: ConformanceDriver,
  harness: ConformanceHarness
): readonly ConformanceTest[] {
  const { expect, fireEvent, waitFor } = harness;
  const tests: ConformanceTest[] = [];
  const it = (name: string, run: () => Promise<void>): void => {
    tests.push({ name, run });
  };

  /** Mount, run, and always unmount. */
  const withTable = async (
    scenario: ConformanceScenario,
    body: (container: HTMLElement) => void | Promise<void>
  ): Promise<void> => {
    const mounted = driver.mount(scenario);
    try {
      await body(mounted.container);
    } finally {
      mounted.unmount();
    }
  };

  it("renders the structural parts on the elements every kit shares", () =>
    withTable(BASE, (container) => {
      expect(part(container, "table")?.tagName).toBe("TABLE");
      expect(part(container, "thead")?.tagName).toBe("THEAD");
      expect(part(container, "tbody")?.tagName).toBe("TBODY");
      expect(part(container, "toolbar")).not.toBeNull();
      expect(part(container, "cell")?.tagName).toBe("TD");
    }));

  it("names the table", () =>
    withTable(BASE, (container) => {
      const tables = [...container.querySelectorAll('table, [role="table"]')];
      expect(
        tables.some((table) => table.getAttribute("aria-label") === "People")
      ).toBe(true);
    }));

  it("renders one header cell per column, keyed by column", () =>
    withTable(BASE, (container) => {
      const keys = parts(container, "header-cell")
        .map((cell) => cell.getAttribute("data-column-key"))
        .filter((key) => key !== null);
      expect(keys).toEqual(["name", "age"]);
    }));

  it("gives every body row its role, id and index, in data order", () =>
    withTable(BASE, (container) => {
      const rows = parts(container, "row");
      expect(rowIds(container)).toEqual(["r1", "r2", "r3"]);
      expect(rows.map((row) => row.getAttribute("role"))).toEqual([
        "row",
        "row",
        "row",
      ]);
      expect(rows.map((row) => row.getAttribute("data-index"))).toEqual([
        "0",
        "1",
        "2",
      ]);
    }));

  it("keys every body cell by its column", () =>
    withTable(BASE, (container) => {
      const first = parts(container, "row")[0];
      const keys = parts(first ?? container, "cell").map((cell) =>
        cell.getAttribute("data-column-key")
      );
      expect(keys).toEqual(["name", "age"]);
    }));

  it("sorts from a sortable header, and says so", () =>
    withTable(BASE, async (container) => {
      const button = sortControlOf(headerFor(container, "age"));
      expect(button).not.toBeNull();
      if (!button) return;
      fireEvent.click(button);
      await waitFor(() => {
        expect(ariaSortOf(headerFor(container, "age"))).toBe("ascending");
        expect(rowIds(container)).toEqual(["r2", "r1", "r3"]);
      });
      fireEvent.click(button);
      await waitFor(() => {
        expect(ariaSortOf(headerFor(container, "age"))).toBe("descending");
        expect(rowIds(container)).toEqual(["r3", "r1", "r2"]);
      });
    }));

  it("does not announce a sort on a header that cannot sort", () =>
    withTable(BASE, (container) => {
      const header = headerFor(container, "name");
      expect(header).not.toBeNull();
      expect(ariaSortOf(header)).toBeNull();
    }));

  it("writes right to left when asked", () =>
    withTable({ ...BASE, dir: "rtl" }, (container) => {
      expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
    }));

  it("lays the rows out as cards on a phone", () =>
    withTable({ ...BASE, mobile: true }, (container) => {
      expect(part(container, "cards")).not.toBeNull();
      expect(parts(container, "card").length).toBe(3);
      expect(part(container, "table")).toBeNull();
    }));

  it("says when there is nothing to show", () =>
    withTable({ ...BASE, rows: [] }, (container) => {
      expect(container.textContent?.includes(defaultLabels.noData)).toBe(true);
      expect(parts(container, "row").length).toBe(0);
    }));

  it("selects a row from its checkbox and marks it selected", () =>
    withTable({ ...BASE, selectable: true }, async (container) => {
      const first = parts(container, "row")[0];
      const checkbox = first?.querySelector(
        'input[type="checkbox"], [role="checkbox"]'
      );
      expect(checkbox ?? null).not.toBeNull();
      if (!first || !checkbox) return;
      expect(first.getAttribute("aria-selected")).toBe("false");
      fireEvent.click(checkbox);
      await waitFor(() => {
        expect(parts(container, "row")[0]?.getAttribute("aria-selected")).toBe(
          "true"
        );
      });
    }));
  return tests;
}
