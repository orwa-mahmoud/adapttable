/**
 * A custom mobile card body.
 *
 * The thing worth testing is not that the host's markup appears — it is what
 * survives around it. Replacing the body must not cost the reader the list
 * semantics, the checkbox, the row actions or the detail panel, because those
 * are what make a card list usable and a custom card has no way to put them
 * back.
 */
import { createMemoryAdapter, useFrontendData } from "@adapttable/react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

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
  it("renders the built-in card when it is omitted", () => {
    render(<Harness />);

    expect(
      document.querySelectorAll('[data-adapttable-part="card-row"]').length
    ).toBeGreaterThan(0);
  });

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
    // The built-in field rows are gone — replaced, not layered under.
    expect(
      document.querySelectorAll('[data-adapttable-part="card-row"]')
    ).toHaveLength(0);
  });

  it("hands over the same value the built-in would have rendered", () => {
    render(
      <Harness
        renderCard={(_row, card) => (
          <p>{card.fields.map((field) => field.value as ReactNode)}</p>
        )}
      />
    );

    expect(screen.getByText(/Dubai/)).toBeInTheDocument();
  });

  it("hands over each field's resolved label, and none where none was asked", () => {
    render(
      <Harness
        renderCard={(_row, card) => (
          <p>{card.fields.map((f) => `${f.column.key}=${f.label ?? "—"} `)}</p>
        )}
      />
    );

    // `city` set `mobileLabel: ""`, which means no caption at all.
    // Two rows, so two cards say it.
    expect(screen.getAllByText(/name=Name city=—/)).toHaveLength(2);
  });

  it("keeps the card shell: list semantics, the part name and the checkbox", () => {
    render(
      <Harness
        bulkActions={[
          { key: "del", label: "Delete", onClick: () => undefined },
        ]}
        renderCard={(row) => <p>{row.name}</p>}
      />
    );

    const cards = document.querySelectorAll('[data-adapttable-part="card"]');
    expect(cards).toHaveLength(2);
    expect(cards[0]?.tagName).toBe("LI");
    // The selection checkbox is the shell's, so a custom body cannot lose it.
    expect(screen.getAllByLabelText(/select row/i)).toHaveLength(2);
  });

  it("keeps row actions and the detail panel around the custom body", () => {
    render(
      <Harness
        rowActions={[{ key: "edit", label: "Edit", onClick: () => undefined }]}
        renderRowDetail={(row) => <span>detail for {row.name}</span>}
        renderCard={(row) => <p>{row.name}</p>}
      />
    );

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
