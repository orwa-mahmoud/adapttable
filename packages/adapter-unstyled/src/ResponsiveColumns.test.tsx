/**
 * Progressive column hiding, against a real table.
 *
 * The arithmetic has its own unit tests; what this proves is the wiring —
 * that the width measured on the table root reaches the columns the table
 * actually renders, in a rendered DOM rather than in a function's return
 * value. No adapter code takes part in this, which is the point: it works
 * the same in every kit because none of them is involved.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "./index";
import { DataTable } from "./testDataTable";

interface Row {
  id: string;
  name: string;
  email: string;
  note: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Ada", email: "ada@example.com", note: "first" },
];

/** Identity stays; the other two are offered up, `note` first. */
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, width: 200 },
  {
    key: "email",
    header: "Email",
    accessor: (r) => r.email,
    width: 200,
    responsivePriority: 1,
  },
  {
    key: "note",
    header: "Note",
    accessor: (r) => r.note,
    width: 200,
    responsivePriority: 2,
  },
];

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness() {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns: COLUMNS,
  });
  return <DataTable source={source} columns={COLUMNS} rowKey={(r) => r.id} />;
}

/** Every element measures this wide, the root included. */
function atWidth(px: number) {
  class FakeResizeObserver {
    observe() {
      return undefined;
    }
    disconnect() {
      return undefined;
    }
    unobserve() {
      return undefined;
    }
  }
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(px);
}

beforeEach(() => {
  adapter = createMemoryAdapter("");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const headers = () =>
  screen.getAllByRole("columnheader").map((h) => h.textContent);

describe("progressive column hiding", () => {
  it("renders every column when there is room", () => {
    atWidth(1200);
    render(<Harness />);

    expect(headers()).toEqual(["Name", "Email", "Note"]);
  });

  it("gives up the highest priority number first", () => {
    atWidth(500);
    render(<Harness />);

    expect(headers()).toEqual(["Name", "Email"]);
  });

  it("gives up both before it squeezes the identity column", () => {
    atWidth(220);
    render(<Harness />);

    expect(headers()).toEqual(["Name"]);
  });

  it("renders the full table where nothing can be measured", () => {
    // No ResizeObserver — the server, and the first paint. Rendering the
    // narrow layout here would drop columns on every load.
    vi.stubGlobal("ResizeObserver", undefined);
    render(<Harness />);

    expect(headers()).toEqual(["Name", "Email", "Note"]);
  });

  it("leaves the column menu offering every column", () => {
    // A responsively hidden column is a fact about the viewport, not a
    // choice the user made — so it must not read as user-hidden.
    atWidth(220);
    render(<Harness />);

    expect(headers()).toEqual(["Name"]);
    // The URL carries no hidden set: nothing was written to the layout.
    expect(adapter.getSearch()).not.toContain("hidden");
  });
});
