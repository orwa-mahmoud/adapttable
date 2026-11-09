import { describe, expect, it } from "vitest";

import { defaultLabels } from "../labels";
import {
  type ConformanceDriver,
  type ConformanceExpectation,
  type ConformanceScenario,
  type ConformanceTest,
  tableConformanceTests,
} from "./tableConformance";

const click = (element: Element): boolean =>
  element.dispatchEvent(new MouseEvent("click", { bubbles: true }));

const keyDown = (element: Element, init?: { key?: string }): boolean =>
  element.dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, key: init?.key })
  );

async function waitFor<T>(callback: () => T): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      return callback();
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  throw last;
}

/** The suite's tests for a driver, with the given expectation. */
function collect(
  driver: ConformanceDriver,
  assert: (actual: unknown) => ConformanceExpectation
): readonly ConformanceTest[] {
  return tableConformanceTests(driver, {
    expect: assert,
    fireEvent: { click, keyDown },
    waitFor,
  });
}

/**
 * The contract drawn with plain DOM: the reference the suite is proved
 * against, so every assertion is shown to be satisfiable.
 */
const referenceDriver: ConformanceDriver = {
  name: "reference",
  mount(scenario) {
    const container = document.createElement("div");
    document.body.append(container);
    const labels = { ...defaultLabels, ...scenario.labels };
    const state: DrawState = {
      sort: undefined,
      selected: new Set<string>(),
      page: 0,
      focus: [0, 0],
      status: "",
      editing: undefined,
      lifted: undefined,
      collapsed: new Set<string>(),
    };
    let controller = new AbortController();
    const notify = (sort?: "asc" | "desc"): void => {
      controller.abort();
      controller = new AbortController();
      scenario.onQueryChange?.(
        {
          page: state.page + 1,
          limit: scenario.pageSize ?? scenario.rows.length,
          ...(sort === undefined
            ? {}
            : { sortBy: "age", sortDir: sort === "asc" ? "asc" : "desc" }),
        },
        { signal: controller.signal }
      );
    };
    const draw = (): void => {
      container.replaceChildren(build(scenario, state));
      for (const button of container.querySelectorAll("th button")) {
        button.addEventListener("click", () => {
          const sort = state.sort === "asc" ? "desc" : "asc";
          if (scenario.mode !== "frontend" && scenario.onQueryChange) {
            notify(sort);
            return;
          }
          state.sort = sort;
          state.status = labels.sortedBy({
            column: button.textContent ?? "",
            ascending: sort === "asc",
          });
          if (scenario.onQueryChange) notify(sort);
          draw();
        });
      }
      for (const row of container.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="row"]'
      )) {
        row.addEventListener("click", (event) => {
          const target = event.target;
          if (
            target instanceof Element &&
            target.closest(
              "button,a,input,select,textarea,label,[role='button'],[role='checkbox']"
            )
          ) {
            return;
          }
          const id = row.dataset.rowId;
          const clicked = scenario.rows.find((item) => item.id === id);
          if (clicked) scenario.onRowClick?.(clicked);
        });
      }
      for (const box of container.querySelectorAll("input[type=checkbox]")) {
        box.addEventListener("click", () => {
          const id = box.closest("tr")?.getAttribute("data-row-id") ?? "";
          if (state.selected.has(id)) state.selected.delete(id);
          else state.selected.add(id);
          draw();
        });
      }
      for (const activate of container.querySelectorAll(
        '[data-adapttable-part="edit-cell-activate"]'
      )) {
        activate.addEventListener("keydown", (event) => {
          if ((event as KeyboardEvent).key !== "Enter") return;
          state.editing = {
            rowId: activate.closest("tr")?.getAttribute("data-row-id") ?? "",
            key: activate.closest("td")?.getAttribute("data-column-key") ?? "",
          };
          draw();
        });
      }
      container
        .querySelector('[data-adapttable-part="edit-cell-editor"]')
        ?.addEventListener("keydown", (event) => {
          const editing = state.editing;
          if ((event as KeyboardEvent).key !== "Enter" || !editing) return;
          const input = event.target as HTMLInputElement;
          scenario.onCellEdit?.(editing.rowId, editing.key, input.value);
          state.editing = undefined;
          draw();
        });
      for (const grip of container.querySelectorAll(
        '[data-adapttable-part="row-reorder-handle"]'
      )) {
        grip.addEventListener("keydown", (event) => {
          const key = (event as KeyboardEvent).key;
          const index = Number(grip.closest("tr")?.getAttribute("data-index"));
          const lifted = state.lifted;
          if (key === " " && !lifted)
            state.lifted = { from: index, over: index };
          else if (key === "ArrowDown" && lifted) lifted.over += 1;
          else if (key === " " && lifted) {
            const rowId = grip.closest("tr")?.getAttribute("data-row-id") ?? "";
            scenario.onRowReorder?.(lifted.from, lifted.over, rowId);
            state.lifted = undefined;
          }
        });
      }
      for (const toggle of container.querySelectorAll(
        '[data-adapttable-part="group-toggle"]'
      )) {
        toggle.addEventListener("click", () => {
          const value = toggle.getAttribute("data-group") ?? "";
          if (state.collapsed.has(value)) state.collapsed.delete(value);
          else state.collapsed.add(value);
          draw();
        });
      }
      container
        .querySelector("[data-next-page]")
        ?.addEventListener("click", () => {
          const size = scenario.pageSize ?? scenario.rows.length;
          const pages = Math.ceil(scenario.rows.length / size);
          state.page = Math.min(state.page + 1, pages - 1);
          const from = state.page * size + 1;
          const to = Math.min(from + size - 1, scenario.rows.length);
          const total = scenario.rows.length;
          state.status = `${labels.pageOf({ page: state.page + 1, total: pages })}. ${labels.showing({ from, to, total })}`;
          draw();
        });
      container
        .querySelector('[role="grid"]')
        ?.addEventListener("keydown", (event) => {
          const [row, column] = state.focus;
          const key = (event as KeyboardEvent).key;
          if (key === "ArrowRight") state.focus = [row, column + 1];
          if (key === "ArrowDown") state.focus = [row + 1, column];
          draw();
          container
            .querySelector<HTMLElement>(
              `[data-grid-cell="${state.focus[0]}:${state.focus[1]}"]`
            )
            ?.focus();
        });
    };
    draw();
    if (scenario.onQueryChange && scenario.mode !== "frontend") notify();
    return {
      container,
      refresh: () => {
        draw();
      },
      unmount: () => container.remove(),
    };
  },
};

/** What the reference table remembers between draws. */
interface DrawState {
  sort: "asc" | "desc" | undefined;
  selected: Set<string>;
  page: number;
  focus: [number, number];
  status: string;
  editing: { rowId: string; key: string } | undefined;
  lifted: { from: number; over: number } | undefined;
  collapsed: Set<string>;
}

function element(
  tag: string,
  attributes: Record<string, string | undefined> = {},
  children: (Node | string)[] = []
): HTMLElement {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== undefined) node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

const ARIA_SORT = {
  asc: "ascending",
  desc: "descending",
  none: "none",
} as const;

type Row = ConformanceScenario["rows"][number];

/** A cell's content: its text, or the edit control while editing is on. */
function cellContent(
  scenario: ConformanceScenario,
  state: DrawState,
  row: Row,
  key: "name" | "age"
): (Node | string)[] {
  const text = String(row[key]);
  if (!scenario.onCellEdit) return [text];
  const open = state.editing?.rowId === row.id && state.editing.key === key;
  return open
    ? [
        element("input", {
          "data-adapttable-part": "edit-cell-editor",
          value: text,
        }),
      ]
    : [
        element("button", { "data-adapttable-part": "edit-cell-activate" }, [
          text,
        ]),
      ];
}

/** One body row, with its reorder handle, checkbox and cells. */
function rowElement(
  scenario: ConformanceScenario,
  state: DrawState,
  row: Row,
  index: number
): HTMLElement {
  const navigable = scenario.navigable === true;
  return element(
    "tr",
    {
      "data-adapttable-part": "row",
      role: "row",
      "data-row-id": row.id,
      "data-index": String(index),
      "aria-rowindex": navigable ? String(index + 1) : undefined,
      "aria-selected": scenario.selectable
        ? String(state.selected.has(row.id))
        : undefined,
    },
    [
      ...(scenario.onRowReorder
        ? [
            element("td", {}, [
              element("button", {
                "data-adapttable-part": "row-reorder-handle",
              }),
            ]),
          ]
        : []),
      ...(scenario.selectable
        ? [element("td", {}, [element("input", { type: "checkbox" })])]
        : []),
      ...scenario.columns.map((column, columnIndex) =>
        element(
          "td",
          {
            "data-adapttable-part": "cell",
            "data-column-key": column.key,
            ...(scenario.isCellFlashing?.(row.id, column.key)
              ? { "data-flash": "" }
              : {}),
            ...(navigable ? gridCellAttributes(state, index, columnIndex) : {}),
          },
          cellContent(scenario, state, row, column.key)
        )
      ),
    ]
  );
}

/** A navigable cell's address, column index and roving tab stop. */
function gridCellAttributes(
  state: DrawState,
  index: number,
  columnIndex: number
): Record<string, string> {
  const focused = state.focus[0] === index && state.focus[1] === columnIndex;
  return {
    "data-grid-cell": `${index}:${columnIndex}`,
    "aria-colindex": String(columnIndex + 1),
    tabindex: focused ? "0" : "-1",
  };
}

/** The body rows, under group headers when the scenario groups. */
function bodyRows(
  scenario: ConformanceScenario,
  state: DrawState,
  rows: readonly Row[]
): HTMLElement[] {
  const groupBy = scenario.groupBy;
  if (!groupBy) {
    return rows.map((row, index) => rowElement(scenario, state, row, index));
  }
  const labels = { ...defaultLabels, ...scenario.labels };
  const body: HTMLElement[] = [];
  for (const value of new Set(rows.map((row) => String(row[groupBy])))) {
    const members = rows.filter((row) => String(row[groupBy]) === value);
    body.push(
      element("tr", { "data-adapttable-part": "group-row" }, [
        element("td", {}, [
          element("button", {
            "data-adapttable-part": "group-toggle",
            "data-group": value,
          }),
          element("span", { "data-adapttable-part": "group-label" }, [value]),
          element("span", { "data-adapttable-part": "group-count" }, [
            labels.groupCount(members.length),
          ]),
        ]),
      ])
    );
    if (state.collapsed.has(value)) continue;
    for (const row of members) {
      body.push(rowElement(scenario, state, row, rows.indexOf(row)));
    }
  }
  return body;
}

function build(scenario: ConformanceScenario, state: DrawState): HTMLElement {
  const { sort } = state;
  const labels = { ...defaultLabels, ...scenario.labels };
  const navigable = scenario.navigable === true;
  const size = scenario.pageSize ?? scenario.rows.length;
  const server =
    scenario.onQueryChange !== undefined && scenario.mode !== "frontend";
  const sorted = [...scenario.rows];
  if (sort && !server) {
    sorted.sort((a, b) => (sort === "asc" ? a.age - b.age : b.age - a.age));
  }
  const rows = server
    ? sorted
    : sorted.slice(state.page * size, state.page * size + size);
  const root = element("div", {
    "data-adapttable-part": "root",
    dir: scenario.dir,
  });
  root.append(
    element("div", { "data-adapttable-part": "toolbar" }, [
      element("input", {
        placeholder: scenario.searchPlaceholder ?? labels.searchPlaceholder,
      }),
    ]),
    element(
      "div",
      {
        "data-adapttable-part": "table-status-announcer",
        "aria-live": "polite",
        "aria-atomic": "true",
      },
      [state.status]
    )
  );
  if (navigable) {
    root.append(element("div", { "data-adapttable-part": "grid-announcer" }));
  }
  if (rows.length === 0) {
    root.append(element("div", { role: "status" }, [labels.noData]));
    return root;
  }
  if (scenario.mobile) {
    root.append(
      element(
        "div",
        { "data-adapttable-part": "cards" },
        (scenario.virtualize ? rows.slice(0, 1) : rows).map((row) =>
          element("div", { "data-adapttable-part": "card" }, [row.name])
        )
      )
    );
    return root;
  }
  const header = scenario.columns.map((column) =>
    element(
      "th",
      {
        "data-adapttable-part": "header-cell",
        "data-column-key": column.key,
        "aria-sort": column.sortable ? ARIA_SORT[sort ?? "none"] : undefined,
      },
      column.sortable
        ? [element("button", {}, [column.header])]
        : [column.header]
    )
  );
  const body = bodyRows(scenario, state, rows);
  root.append(
    element(
      "table",
      {
        "data-adapttable-part": "table",
        "aria-label": scenario.tableLabel,
        role: navigable ? "grid" : undefined,
        "aria-rowcount": String(scenario.rows.length),
        "aria-colcount": navigable
          ? String(scenario.columns.length)
          : undefined,
      },
      [
        element("thead", { "data-adapttable-part": "thead" }, [
          element("tr", {}, header),
        ]),
        element("tbody", { "data-adapttable-part": "tbody" }, body),
      ]
    )
  );
  if (scenario.pageSize !== undefined) {
    root.append(
      element("button", { "data-next-page": "", "aria-label": labels.nextPage })
    );
  }
  return root;
}

/** An expectation that records a failure instead of throwing. */
function recording(
  failures: string[]
): (actual: unknown) => ConformanceExpectation {
  const record = (ok: boolean, what: string): void => {
    if (!ok) failures.push(what);
  };
  return (actual) => ({
    toBe: (expected) => record(Object.is(actual, expected), "toBe"),
    toEqual: (expected) =>
      record(JSON.stringify(actual) === JSON.stringify(expected), "toEqual"),
    toHaveLength: (expected) =>
      record(
        typeof actual === "object" &&
          actual !== null &&
          "length" in actual &&
          actual.length === expected,
        "toHaveLength"
      ),
    toBeNull: () => record(actual === null, "toBeNull"),
    not: { toBeNull: () => record(actual !== null, "not.toBeNull") },
  });
}

describe("the table conformance suite", () => {
  const tests = collect(referenceDriver, expect);
  const failures: string[] = [];

  it("returns every assertion, in order", () => {
    expect(tests.map((test) => test.name)).toHaveLength(30);
  });

  for (const test of tests) {
    it(`holds on the reference: ${test.name}`, async () => {
      await expect(test.run()).resolves.toBeUndefined();
    });
  }

  it("fails every assertion against a table that draws nothing", async () => {
    const blank: ConformanceDriver = {
      name: "blank",
      mount: () => {
        const container = document.createElement("div");
        return { container, unmount: () => container.remove() };
      },
    };
    for (const test of collect(blank, (actual) =>
      recording(failures)(actual)
    )) {
      const before = failures.length;
      await test.run();
      expect(failures.length, test.name).toBeGreaterThan(before);
    }
  });
  it("unmounts even when an assertion throws", async () => {
    let unmounted = 0;
    const throwing: ConformanceDriver = {
      name: "throwing",
      mount: () => ({
        container: document.createElement("div"),
        unmount: () => {
          unmounted++;
        },
      }),
    };
    const [first] = collect(throwing, expect);
    await expect(first!.run()).rejects.toThrow();
    expect(unmounted).toBe(1);
  });

  it("waits for a framework's queued mount before inspecting its first view", async () => {
    let ready = false;
    let released = 0;
    const deferred: ConformanceDriver = {
      name: "deferred",
      mount(scenario) {
        const view = referenceDriver.mount(scenario);
        return {
          ...view,
          ready: Promise.resolve().then(() => {
            ready = true;
          }),
          unmount: () => {
            released++;
            view.unmount();
          },
        };
      },
    };
    const [first] = collect(deferred, (actual) => {
      expect(ready).toBe(true);
      return expect(actual);
    });
    await first!.run();
    expect(released).toBe(1);
  });

  it("releases a mount whose readiness rejects without starting assertions", async () => {
    let inspected = false;
    let released = 0;
    const deferred: ConformanceDriver = {
      name: "failed mount",
      mount: () => ({
        container: document.createElement("div"),
        ready: Promise.reject(new Error("Native mount failed")),
        unmount: () => {
          released++;
        },
      }),
    };
    const [first] = collect(deferred, (actual) => {
      inspected = true;
      return expect(actual);
    });
    await expect(first!.run()).rejects.toThrow("Native mount failed");
    expect(inspected).toBe(false);
    expect(released).toBe(1);
  });
});
