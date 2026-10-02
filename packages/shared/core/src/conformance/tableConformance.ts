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
 * column definitions, `selectable` into its selection feature, `navigable`
 * into its cell navigation, `pageSize` into its default page size, `labels`
 * into its labels — and returns the container and the unmount. Nothing in the
 * suite changes.
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
 * The labels a scenario overrides — the host's own words, which the table
 * must use in its controls and in what it announces.
 *
 * @public
 */
export interface ConformanceLabels {
  /** The empty-state message. */
  readonly noData?: string;
  /** The name of the pager's next-page control. */
  readonly nextPage?: string;
  /** The sentence announced after a sort. */
  readonly sortedBy?: (info: {
    readonly column: string;
    readonly ascending: boolean;
  }) => string;
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
  /** Rows per page. Omit for the binding's default page size. */
  readonly pageSize?: number;
  /** Compose keyboard cell navigation. */
  readonly navigable?: boolean;
  /**
   * Make every column editable in place, handing each committed edit here —
   * the row's id, the column and the value the host receives.
   */
  readonly onCellEdit?: (
    rowId: string,
    columnKey: string,
    value: unknown
  ) => void;
  /** Compose row reorder, handing each move here. */
  readonly onRowReorder?: (from: number, to: number, rowId: string) => void;
  /** Group the rows under headers by one column. */
  readonly groupBy?: "name" | "age";
  /**
   * Compose virtualization over an infinite list in a height-capped box, so
   * the body renders a window of its rows.
   */
  readonly virtualize?: boolean;
  /** Labels that replace the defaults. */
  readonly labels?: ConformanceLabels;
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
  readonly fireEvent: {
    readonly click: (element: Element) => unknown;
    readonly keyDown: (
      element: Element,
      init?: { readonly key?: string }
    ) => unknown;
  };
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

function parts(root: ParentNode, name: string): HTMLElement[] {
  return [
    ...root.querySelectorAll<HTMLElement>(`[data-adapttable-part="${name}"]`),
  ];
}

/** The live region that says what changed after a sort or a page. */
function statusRegion(root: HTMLElement): HTMLElement | null {
  return root.ownerDocument.querySelector<HTMLElement>(
    '[data-adapttable-part="table-status-announcer"]'
  );
}

/** Text with its whitespace collapsed, as a reader hears it. */
function spoken(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/**
 * The control a reader knows by `name`: a button or link whose accessible
 * name — its `aria-label`, `title` or text — is that name.
 */
function controlNamed(root: ParentNode, name: string): Element | null {
  const controls = root.querySelectorAll('button, [role="button"], a[href]');
  return (
    [...controls].find(
      (control) =>
        control.getAttribute("aria-label") === name ||
        control.getAttribute("title") === name ||
        spoken(control) === name
    ) ?? null
  );
}

/**
 * Type into a text field as a reader does: the value through the element's
 * own setter (which frameworks track), then the input event.
 */
function typeInto(field: Element, value: string): void {
  const input =
    field instanceof HTMLInputElement
      ? field
      : field.querySelector<HTMLInputElement>("input");
  if (!input) throw new Error("the editor has no text field");
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function gridCell(root: ParentNode, row: number, column: number) {
  return root.querySelector<HTMLElement>(`[data-grid-cell="${row}:${column}"]`);
}

function rowIds(root: ParentNode): (string | null)[] {
  return parts(root, "row").map((row) => row.dataset.rowId ?? null);
}

function headerFor(root: ParentNode, key: string): Element | null {
  return (
    parts(root, "header-cell").find((cell) => cell.dataset.columnKey === key) ??
    null
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
        .map((cell) => cell.dataset.columnKey)
        .filter((key) => key !== undefined);
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
      expect(rows.map((row) => row.dataset.index)).toEqual(["0", "1", "2"]);
    }));

  it("keys every body cell by its column", () =>
    withTable(BASE, (container) => {
      const first = parts(container, "row")[0];
      const keys = parts(first ?? container, "cell").map(
        (cell) => cell.dataset.columnKey
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

  it("keeps an empty, polite status region from the first paint", () =>
    withTable(BASE, (container) => {
      // A region that appears together with its text is often missed, so it
      // must be in the document, and silent, before there is anything to say.
      const region = statusRegion(container);
      expect(region).not.toBeNull();
      expect(spoken(region)).toBe("");
      expect(region?.getAttribute("aria-live")).toBe("polite");
      expect(region?.getAttribute("aria-atomic")).toBe("true");
    }));

  it("announces the column and direction of each sort", () =>
    withTable(BASE, async (container) => {
      const button = sortControlOf(headerFor(container, "age"));
      expect(button).not.toBeNull();
      if (!button) return;
      fireEvent.click(button);
      await waitFor(() => {
        expect(spoken(statusRegion(container))).toBe(
          defaultLabels.sortedBy({ column: "Age", ascending: true })
        );
      });
      fireEvent.click(button);
      await waitFor(() => {
        expect(spoken(statusRegion(container))).toBe(
          defaultLabels.sortedBy({ column: "Age", ascending: false })
        );
      });
    }));

  it("announces the page and the rows on it when the reader pages", () =>
    withTable({ ...BASE, pageSize: 2 }, async (container) => {
      const next = controlNamed(container, defaultLabels.nextPage);
      expect(next).not.toBeNull();
      if (!next) return;
      fireEvent.click(next);
      await waitFor(() => {
        const said = spoken(statusRegion(container));
        expect(said.includes(defaultLabels.pageOf({ page: 2, total: 2 }))).toBe(
          true
        );
        // The count is the footer's own wording, not a bare number.
        expect(
          said.includes(defaultLabels.showing({ from: 3, to: 3, total: 3 }))
        ).toBe(true);
      });
      expect(rowIds(container)).toEqual(["r3"]);
    }));

  it("states the dataset size on a page that shows part of it", () =>
    withTable({ ...BASE, pageSize: 2 }, (container) => {
      expect(parts(container, "row").length).toBe(2);
      expect(part(container, "table")?.getAttribute("aria-rowcount")).toBe("3");
      // Nothing claims the grid keyboard contract without cell navigation.
      expect(container.querySelector('[role="grid"]')).toBeNull();
    }));

  it("speaks the host's labels, right to left", () =>
    withTable(
      {
        ...BASE,
        dir: "rtl",
        labels: {
          sortedBy: ({ column, ascending }) =>
            `مُرتَّب حسب ${column}، ${ascending ? "تصاعدي" : "تنازلي"}`,
        },
      },
      async (container) => {
        const button = sortControlOf(headerFor(container, "age"));
        expect(button).not.toBeNull();
        if (!button) return;
        fireEvent.click(button);
        await waitFor(() => {
          expect(spoken(statusRegion(container))).toBe(
            "مُرتَّب حسب Age، تصاعدي"
          );
        });
      }
    ));

  it("names its controls and states in the host's labels", () =>
    withTable(
      {
        ...BASE,
        pageSize: 2,
        labels: { nextPage: "الصفحة التالية", noData: "لا توجد بيانات" },
      },
      (container) => {
        expect(controlNamed(container, "الصفحة التالية")).not.toBeNull();
        expect(controlNamed(container, defaultLabels.nextPage)).toBeNull();
      }
    ).then(() =>
      withTable(
        { ...BASE, rows: [], labels: { noData: "لا توجد بيانات" } },
        (container) => {
          expect(container.textContent?.includes("لا توجد بيانات")).toBe(true);
          expect(container.textContent?.includes(defaultLabels.noData)).toBe(
            false
          );
        }
      )
    ));

  it("makes the table a grid with its dimensions under cell navigation", () =>
    withTable({ ...BASE, navigable: true }, (container) => {
      const grid = container.querySelector('[role="grid"]');
      expect(grid).not.toBeNull();
      expect(grid?.getAttribute("aria-rowcount")).toBe("3");
      expect(grid?.getAttribute("aria-colcount")).toBe("2");
    }));

  it("gives one cell the tab stop and every cell its column index", () =>
    withTable({ ...BASE, navigable: true }, (container) => {
      expect(gridCell(container, 0, 0)?.getAttribute("tabindex")).toBe("0");
      expect(gridCell(container, 0, 1)?.getAttribute("tabindex")).toBe("-1");
      expect(gridCell(container, 0, 0)?.getAttribute("aria-colindex")).toBe(
        "1"
      );
      expect(gridCell(container, 0, 1)?.getAttribute("aria-colindex")).toBe(
        "2"
      );
      const rowIndexes = [
        ...container.querySelectorAll('[role="row"][aria-rowindex]'),
      ].map((row) => row.getAttribute("aria-rowindex"));
      expect(rowIndexes.includes("1")).toBe(true);
    }));

  it("moves focus between cells with the arrow keys", () =>
    withTable({ ...BASE, navigable: true }, async (container) => {
      const grid = container.querySelector('[role="grid"]');
      expect(grid).not.toBeNull();
      if (!grid) return;
      fireEvent.keyDown(grid, { key: "ArrowRight" });
      await waitFor(() => {
        expect(container.ownerDocument.activeElement).toBe(
          gridCell(container, 0, 1)
        );
      });
      fireEvent.keyDown(grid, { key: "ArrowDown" });
      await waitFor(() => {
        expect(container.ownerDocument.activeElement).toBe(
          gridCell(container, 1, 1)
        );
      });
    }));

  it("renders the focus announcer only under cell navigation", () =>
    withTable({ ...BASE, navigable: true }, (container) => {
      expect(part(container, "grid-announcer")).not.toBeNull();
    }).then(() =>
      withTable(BASE, (container) => {
        expect(part(container, "grid-announcer")).toBeNull();
        expect(gridCell(container, 0, 0)).toBeNull();
      })
    ));

  it("opens a cell's editor from the keyboard and hands the host the edit", () => {
    const edits: unknown[][] = [];
    return withTable(
      {
        ...BASE,
        onCellEdit: (rowId, columnKey, value) => {
          edits.push([rowId, columnKey, value]);
        },
      },
      async (container) => {
        const activate = parts(container, "edit-cell-activate")[0] ?? null;
        expect(activate).not.toBeNull();
        if (!activate) return;
        fireEvent.keyDown(activate, { key: "Enter" });
        const editor = await waitFor(() => {
          const found = part(container, "edit-cell-editor");
          expect(found).not.toBeNull();
          return found!;
        });
        typeInto(editor, "Ada L");
        const field =
          editor instanceof HTMLInputElement
            ? editor
            : (editor.querySelector("input") ?? editor);
        fireEvent.keyDown(field, { key: "Enter" });
        await waitFor(() => {
          expect(edits).toEqual([["r1", "name", "Ada L"]]);
        });
      }
    );
  });

  it("moves a row with the keyboard and tells the host where", () => {
    const moves: unknown[][] = [];
    return withTable(
      {
        ...BASE,
        onRowReorder: (from, to, rowId) => {
          moves.push([from, to, rowId]);
        },
      },
      async (container) => {
        const grip = parts(container, "row-reorder-handle")[0] ?? null;
        expect(grip).not.toBeNull();
        if (!grip) return;
        fireEvent.keyDown(grip, { key: " " });
        fireEvent.keyDown(grip, { key: "ArrowDown" });
        fireEvent.keyDown(grip, { key: " " });
        await waitFor(() => {
          expect(moves).toEqual([[0, 1, "r1"]]);
        });
      }
    );
  });

  it("groups rows under headers with their counts, and collapses a group", () =>
    withTable(
      {
        ...BASE,
        rows: [
          { id: "r1", name: "Ada", age: 36 },
          { id: "r2", name: "Grace", age: 36 },
          { id: "r3", name: "Linus", age: 54 },
        ],
        groupBy: "age",
      },
      async (container) => {
        expect(parts(container, "group-label").map(spoken)).toEqual([
          "36",
          "54",
        ]);
        expect(parts(container, "group-count").map(spoken)).toEqual([
          "(2)",
          "(1)",
        ]);
        expect(rowIds(container)).toEqual(["r1", "r2", "r3"]);
        const toggle = parts(container, "group-toggle")[0] ?? null;
        expect(toggle).not.toBeNull();
        if (!toggle) return;
        fireEvent.click(toggle);
        await waitFor(() => {
          expect(rowIds(container)).toEqual(["r3"]);
        });
      }
    ));

  it("renders a window of virtualized phone cards, not every card", () =>
    withTable({ ...BASE, virtualize: true, mobile: true }, (container) => {
      expect(part(container, "cards")).not.toBeNull();
      expect(parts(container, "card").length < CONFORMANCE_ROWS.length).toBe(
        true
      );
    }));

  return tests;
}
