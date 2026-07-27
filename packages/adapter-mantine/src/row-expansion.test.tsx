import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

const renderRowDetail = (row: Row) => <div>Detail for {row.name}</div>;

interface HarnessProps {
  isMobile?: boolean;
  override?: Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;
}

let adapter: ReturnType<typeof createMemoryAdapter>;

function Harness(props: HarnessProps) {
  const source = useFrontendData<Row>({ data: ROWS, adapter, columns });
  return (
    <DataTable<Row>
      source={source}
      columns={columns}
      rowKey={(r) => r.id}
      renderRowDetail={renderRowDetail}
      isMobile={props.isMobile}
      {...props.override}
    />
  );
}

function renderHarness(props: HarnessProps = {}) {
  adapter = createMemoryAdapter("");
  return render(
    <MantineProvider>
      <Harness {...props} />
    </MantineProvider>
  );
}

describe("row expansion (Mantine)", () => {
  it("desktop: the chevron expands and collapses a detail row", () => {
    renderHarness();
    // A leading header cell with a visually-hidden label joins the columns.
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    const toggles = screen.getAllByRole("button", { name: "Expand row" });
    expect(toggles).toHaveLength(2);
    expect(toggles[0]).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Detail for Alice")).not.toBeInTheDocument();

    fireEvent.click(toggles[0]!);
    expect(screen.getByText("Detail for Alice")).toBeInTheDocument();
    expect(screen.queryByText("Detail for Bob")).not.toBeInTheDocument();
    const collapse = screen.getByRole("button", { name: "Collapse row" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    // The detail cell spans the chevron column plus both data columns.
    expect(screen.getByText("Detail for Alice").closest("td")).toHaveAttribute(
      "colspan",
      "3"
    );

    fireEvent.click(collapse);
    expect(screen.queryByText("Detail for Alice")).not.toBeInTheDocument();
    expect(toggles[0]).toHaveAttribute("aria-expanded", "false");
  });

  it("desktop: the detail row spans selection and actions columns too", () => {
    renderHarness({
      override: {
        bulkActions: [{ key: "x", label: "Export", onClick: () => undefined }],
        rowActions: [{ key: "e", label: "Edit", onClick: () => undefined }],
      },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Expand row" })[0]!);
    // chevron + checkbox + 2 data columns + actions = 5.
    expect(screen.getByText("Detail for Alice").closest("td")).toHaveAttribute(
      "colspan",
      "5"
    );
  });

  it("desktop: the chevron never activates onRowClick, the row still does", () => {
    const onRowClick = vi.fn();
    renderHarness({ override: { onRowClick } });
    fireEvent.click(screen.getAllByRole("button", { name: "Expand row" })[0]!);
    expect(onRowClick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
  });

  it("mobile: the card chevron toggles the detail inside the card", () => {
    renderHarness({ isMobile: true });
    const cards = screen.getAllByRole("listitem");
    const toggle = within(cards[0]!).getByRole("button", {
      name: "Expand row",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(toggle);
    expect(within(cards[0]!).getByText("Detail for Alice")).toBeInTheDocument();
    expect(screen.queryByText("Detail for Bob")).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("Collapse row");

    fireEvent.click(toggle);
    expect(screen.queryByText("Detail for Alice")).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
