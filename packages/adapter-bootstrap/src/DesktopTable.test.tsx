import type { SharedTableRenderProps } from "@adapttable/core/adapter";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DesktopTable } from "./components/DesktopTable";

interface Person {
  id: string;
  name: string;
  email: string;
}

const rows: Person[] = [
  { id: "1", name: "Alice", email: "alice@example.com" },
  { id: "2", name: "Bob", email: "bob@example.com" },
];

function makeProps(): SharedTableRenderProps<Person> {
  const columns = [
    { key: "name", header: "Name", sortable: true },
    { key: "email", header: <span>Email Node</span>, sortable: false },
  ];

  return {
    table: {
      columns,
      labels: { sortBy: "Sort by" },
      getHeaderRowProps: () => ({}),
      getHeaderCellProps: (col: any) => ({
        "aria-sort": col.key === "name" ? "ascending" : undefined,
      }),
      getRowProps: () => ({}),
      getCellProps: () => ({}),
      getRowKey: (row: Person) => row.id,
      getCellContent: (column: any, row: Person) => {
        const key = column.key as keyof Person;
        return row[key] ? String(row[key]) : null;
      },
      getSortButtonProps: (column: any) =>
        column.sortable
          ? {
              type: "button" as const,
              disabled: false,
              "aria-label": `Sort by: ${column.header}`,
              onClick: vi.fn(),
            }
          : undefined,
    } as unknown as SharedTableRenderProps<Person>["table"],
    rows,
    confirm: () => undefined,
    getRowId: (row: Person) => row.id,
  };
}

describe("DesktopTable", () => {
  it("renders column headers, handles sorting click and fallback header key", () => {
    const props = makeProps();
    const sortClick = vi.fn();
    props.table.getSortButtonProps = (column: any) => ({
      type: "button" as const,
      disabled: false,
      "aria-label": `Sort by: ${column?.header ?? ""}`,
      onClick: sortClick,
    });

    render(<DesktopTable {...props} />);

    const sortButton = screen.getByRole("button", { name: "Sort by: Name" });
    expect(sortButton).toBeInTheDocument();
    fireEvent.click(sortButton);
    expect(sortClick).toHaveBeenCalled();

    expect(screen.getByText("Email Node")).toBeInTheDocument();
  });

  it("renders row values", () => {
    render(<DesktopTable {...makeProps()} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("renders an empty body when there are no rows", () => {
    render(<DesktopTable {...makeProps()} rows={[]} />);
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /Name/ })
    ).toBeInTheDocument();
  });

  it("falls back to column.accessor when table.getCellContent is undefined", () => {
    const props = makeProps();
    const tableWithoutCellContent = { ...props.table };
    delete (tableWithoutCellContent as any).getCellContent;

    const columnsWithAccessor = [
      {
        key: "name",
        header: "Name",
        accessor: (row: Person) => `Acc-${row.name}`,
      },
    ];

    render(
      <DesktopTable
        {...props}
        table={
          {
            ...tableWithoutCellContent,
            columns: columnsWithAccessor,
          } as any
        }
      />
    );

    expect(screen.getByText("Acc-Alice")).toBeInTheDocument();
  });

  it("renders header actions and a multi-sort index badge", () => {
    const props = makeProps();
    props.table.columns = [
      {
        key: "name",
        header: "Name",
        sortable: true,
        headerActions: <button type="button">Filter name</button>,
      },
      { key: "email", header: "Email", sortable: false },
    ];
    props.table.getSortButtonProps = (column: any) => ({
      type: "button" as const,
      disabled: false,
      "aria-label": `Sort by: ${column.header}`,
      ...(column.sortable ? { "data-sort-index": 1 } : {}),
      onClick: vi.fn(),
    });

    render(<DesktopTable {...props} size="sm" dir="rtl" />);

    expect(
      screen.getByRole("button", { name: "Filter name" })
    ).toBeInTheDocument();
    expect(document.querySelector("[data-sort-index='1']")).toBeInTheDocument();
  });

  it("handles pinned columns (start and end offsets), column widths, and resize handle", () => {
    const setWidth = vi.fn();
    const props = makeProps();

    render(
      <DesktopTable
        {...props}
        setWidth={setWidth}
        fitColumns={true}
        columnWidths={{ name: 150, email: 200 }}
        pinOffset={(key) => {
          if (key === "name") return { side: "start", inset: 0 };
          if (key === "email") return { side: "end", inset: 10 };
          return undefined;
        }}
      />
    );

    const resizeHandles = document.querySelectorAll<HTMLElement>(
      '[aria-label*="Resize column"]'
    );
    expect(resizeHandles.length).toBeGreaterThan(0);
    expect(resizeHandles[0]?.style.insetInlineEnd).toBe("0px");

    const startHeader = screen.getByRole("columnheader", { name: /Name/ });
    const endHeader = screen.getByRole("columnheader", { name: /Email/ });
    expect(startHeader.style.insetInlineStart).toBe("0px");
    expect(endHeader.style.insetInlineEnd).toBe("10px");

    expect(document.querySelectorAll(".table-responsive")).toHaveLength(1);
  });
});
