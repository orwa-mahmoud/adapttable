/**
 * A custom mobile card body, in this kit.
 *
 * What matters is not that the host's markup appears — it is what survives
 * around it. Replacing the body must not cost the reader the selection
 * checkbox, the row actions or the detail panel, because those belong to the
 * shell and a custom card has no way to put them back.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { DataTable } from "./testDataTable";
import type { ColumnDef } from "./index";
import { rowDetail } from "./row-detail";

interface Row {
  id: string;
  name: string;
  city: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Ada", city: "Dubai" },
  { id: "b", name: "Grace", city: "Riyadh" },
];

const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
  { key: "city", header: "City", accessor: (r) => r.city, mobileLabel: "" },
];

let adapter: ReturnType<typeof createMemoryAdapter>;

type Override = Partial<Omit<Parameters<typeof DataTable<Row>>[0], "mode">>;

function Harness(props: Readonly<Override>) {
  const source = useFrontendData<Row>({
    data: ROWS,
    urlAdapter: adapter,
    columns: COLUMNS,
  });
  return (
    <DataTable
      source={source}
      columns={COLUMNS}
      rowKey={(r) => r.id}
      forceMobile
      {...props}
    />
  );
}

beforeEach(() => {
  adapter = createMemoryAdapter("");
});

describe("renderCard", () => {
  it("replaces the body with the host's layout", () => {
    render(
      <Harness
        renderCard={(row, card) => (
          <p>
            {row.name} · {card.fields.length} fields
          </p>
        )}
      />
    );

    expect(screen.getByText(/Ada · 2 fields/)).toBeInTheDocument();
    expect(screen.getByText(/Grace · 2 fields/)).toBeInTheDocument();
  });

  it("hands over the same value the built-in would have rendered", () => {
    render(
      <Harness
        renderCard={(_row, card) => (
          <p>{card.fields.map((field) => field.value)}</p>
        )}
      />
    );

    expect(screen.getByText(/Dubai/)).toBeInTheDocument();
  });

  it("hands over each field's label, and none where none was asked", () => {
    render(
      <Harness
        renderCard={(_row, card) => (
          <p>{card.fields.map((f) => `${f.column.key}=${f.label ?? "—"} `)}</p>
        )}
      />
    );

    // `city` set `mobileLabel: ""`, which means no caption at all.
    expect(screen.getAllByText(/name=Name city=—/)).toHaveLength(2);
  });

  it("keeps the checkbox, the row actions and the detail panel", () => {
    render(
      <Harness
        bulkActions={[
          { key: "del", label: "Delete", onClick: () => undefined },
        ]}
        rowActions={[{ key: "edit", label: "Edit", onClick: () => undefined }]}
        renderRowDetail={(row) => <span>detail for {row.name}</span>}
        features={[rowDetail((row: Row) => <span>detail for {row.name}</span>)]}
        renderCard={(row) => <p>{row.name}</p>}
      />
    );

    expect(screen.getAllByLabelText(/select row/i)).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: /expand/i })[0]!);
    expect(screen.getByText(/detail for Ada/)).toBeInTheDocument();
  });

  it("reports selection and expansion to the custom body", () => {
    render(
      <Harness
        bulkActions={[
          { key: "del", label: "Delete", onClick: () => undefined },
        ]}
        renderRowDetail={() => <span>detail</span>}
        features={[rowDetail(() => <span>detail</span>)]}
        renderCard={(row, card) => (
          <p>
            {row.name}:{card.selected ? "on" : "off"}:
            {card.expanded ? "open" : "shut"}
          </p>
        )}
      />
    );

    expect(screen.getByText("Ada:off:shut")).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText(/select row/i)[0]!);
    expect(screen.getByText("Ada:on:shut")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /expand/i })[0]!);
    expect(screen.getByText("Ada:on:open")).toBeInTheDocument();
  });
});
