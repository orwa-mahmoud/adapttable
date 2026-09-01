import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "./index";
import { DataTable } from "./testDataTable";

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

const wrap = (node: React.ReactNode) => (
  <MantineProvider>{node}</MantineProvider>
);

describe("extra rows (mantine)", () => {
  it("renders nothing extra until the host asks", () => {
    render(
      wrap(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
        />
      )
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
      wrap(
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
      )
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

  it("keeps a named extra in front of a pinned row", () => {
    render(
      wrap(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          pinnedRowIds={{ top: ["1"], bottom: [] }}
          onPinnedRowIdsChange={() => undefined}
          extraRows={[
            {
              key: "n",
              kind: "fullWidth",
              beforeRowId: "1",
              render: () => "Attached to Ship",
            },
          ]}
        />
      )
    );
    expect(screen.getByText("Attached to Ship")).toBeTruthy();
    const pin = document.querySelector('[data-adapttable-part="pinned-top"]');
    expect(pin?.textContent).toContain("Ship");
  });
});
