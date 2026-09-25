import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Task {
  id: string;
  title: string;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship" },
  { id: "2", title: "Test" },
];
const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
];

describe("rowStyle (shadcn)", () => {
  it("applies rowStyle and rowHeight to desktop rows", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        rowStyle={(row) =>
          row.id === "1" ? { color: "rgb(255, 0, 0)" } : undefined
        }
        rowHeight={48}
      />
    );
    const rows = document.querySelectorAll('[data-adapttable-part="row"]');
    expect(rows[0]).toHaveStyle({ color: "rgb(255, 0, 0)", height: "48px" });
    expect(rows[1]).toHaveStyle({ height: "48px" });
    expect(rows[1]).not.toHaveStyle({ color: "rgb(255, 0, 0)" });
  });

  it("applies rowStyle to mobile cards", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        forceMobile
        rowStyle={(_row, index) =>
          index === 0 ? { backgroundColor: "rgb(0, 128, 0)" } : undefined
        }
      />
    );
    const cards = document.querySelectorAll('[data-adapttable-part="card"]');
    expect(cards[0]).toHaveStyle({ backgroundColor: "rgb(0, 128, 0)" });
    expect(cards[1]).not.toHaveStyle({ backgroundColor: "rgb(0, 128, 0)" });
  });
});
