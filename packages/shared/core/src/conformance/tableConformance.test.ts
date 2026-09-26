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
    fireEvent: { click },
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
    let sort: "asc" | "desc" | undefined;
    const selected = new Set<string>();
    const draw = (): void => {
      container.replaceChildren(build(scenario, sort, selected));
      for (const button of container.querySelectorAll("th button")) {
        button.addEventListener("click", () => {
          sort = sort === "asc" ? "desc" : "asc";
          draw();
        });
      }
      for (const box of container.querySelectorAll("input[type=checkbox]")) {
        box.addEventListener("click", () => {
          const id = box.closest("tr")?.getAttribute("data-row-id") ?? "";
          if (selected.has(id)) selected.delete(id);
          else selected.add(id);
          draw();
        });
      }
    };
    draw();
    return { container, unmount: () => container.remove() };
  },
};

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

function build(
  scenario: ConformanceScenario,
  sort: "asc" | "desc" | undefined,
  selected: ReadonlySet<string>
): HTMLElement {
  const rows = [...scenario.rows];
  if (sort) {
    rows.sort((a, b) => (sort === "asc" ? a.age - b.age : b.age - a.age));
  }
  const root = element("div", {
    "data-adapttable-part": "root",
    dir: scenario.dir,
  });
  root.append(element("div", { "data-adapttable-part": "toolbar" }));
  if (rows.length === 0) {
    root.append(element("div", { role: "status" }, [defaultLabels.noData]));
    return root;
  }
  if (scenario.mobile) {
    root.append(
      element(
        "div",
        { "data-adapttable-part": "cards" },
        rows.map((row) =>
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
  const body = rows.map((row, index) =>
    element(
      "tr",
      {
        "data-adapttable-part": "row",
        role: "row",
        "data-row-id": row.id,
        "data-index": String(index),
        "aria-selected": scenario.selectable
          ? String(selected.has(row.id))
          : undefined,
      },
      [
        ...(scenario.selectable
          ? [element("td", {}, [element("input", { type: "checkbox" })])]
          : []),
        ...scenario.columns.map((column) =>
          element(
            "td",
            { "data-adapttable-part": "cell", "data-column-key": column.key },
            [String(row[column.key])]
          )
        ),
      ]
    )
  );
  root.append(
    element(
      "table",
      { "data-adapttable-part": "table", "aria-label": scenario.tableLabel },
      [
        element("thead", { "data-adapttable-part": "thead" }, [
          element("tr", {}, header),
        ]),
        element("tbody", { "data-adapttable-part": "tbody" }, body),
      ]
    )
  );
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
    toBeNull: () => record(actual === null, "toBeNull"),
    not: { toBeNull: () => record(actual !== null, "not.toBeNull") },
  });
}

describe("the table conformance suite", () => {
  const tests = collect(referenceDriver, expect);
  const failures: string[] = [];

  it("returns every assertion, in order", () => {
    expect(tests.map((test) => test.name)).toHaveLength(11);
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
});
