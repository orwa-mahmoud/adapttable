import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./testDataTable";
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

describe("extra rows (shadcn)", () => {
  it("renders nothing extra until the host asks", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
      />
    );
    expect(
      document.querySelector('[data-adapttable-part="separator-row"]')
    ).toBeNull();
    expect(
      document.querySelector('[data-adapttable-part="full-width-row"]')
    ).toBeNull();
  });

  it("inserts a separator before the named row and a note at the end", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        extraRows={[
          { key: "s", kind: "separator", beforeRowId: "2" },
          { key: "n", kind: "fullWidth", render: () => "Team note" },
        ]}
      />
    );
    expect(
      document.querySelector('[data-adapttable-part="separator-row"]')
    ).toBeTruthy();
    expect(screen.getByText("Team note")).toBeTruthy();
    const body = document.querySelector('[data-adapttable-part="tbody"]');
    const keys = [...(body?.querySelectorAll("[data-adapttable-part]") ?? [])]
      .map((el) => el.getAttribute("data-adapttable-part"))
      .filter((part) => part === "row" || part?.endsWith("-row"));
    expect(keys).toContain("separator-row");
    expect(keys).toContain("full-width-row");
  });
});
