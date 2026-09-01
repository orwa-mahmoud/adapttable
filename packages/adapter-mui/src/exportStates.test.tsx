import { xlsxWriter } from "@adapttable/core/xlsx";
import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import { exportCsv } from "./export";
import type { ColumnDef } from "./index";
import { renderMui } from "./test-utils";

/**
 * A host-handled export takes time, and a download says nothing when it lands.
 *
 * So the button shows THIS kit's own loading affordance rather than going
 * grey — a disabled control looks broken, a loading one looks busy — and the
 * outcome is announced, since the file arriving is otherwise invisible to a
 * screen reader.
 */
interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [{ id: "a", name: "Alice" }];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

function renderExport(request: () => Promise<void>) {
  return renderMui(
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      urlSync={false}
      features={[exportCsv<Row>({ request })]}
      exportCsv={{ request }}
    />
  );
}

describe("export states (MUI)", () => {
  it("shows MUI's own loading affordance while the export runs", async () => {
    let settle!: () => void;
    const { container } = renderExport(
      () =>
        new Promise<void>((resolve) => {
          settle = resolve;
        })
    );
    const button = screen.getByRole("button", { name: "Export CSV" });

    await act(async () => {
      button.click();
      await Promise.resolve();
    });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(container.querySelector(".MuiCircularProgress-root")).not.toBeNull();

    await act(async () => {
      settle();
      await Promise.resolve();
    });
    expect(button).not.toBeDisabled();
  });

  it("announces the outcome once the export finishes", async () => {
    renderExport(() => Promise.resolve());
    // Present and empty before there is anything to say: a region that appears
    // with its message is frequently never read.
    expect(screen.getByRole("status")).toHaveTextContent("");

    await act(async () => {
      screen.getByRole("button", { name: "Export CSV" }).click();
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Export complete");
  });

  it("announces a failure rather than failing silently", async () => {
    renderExport(() => Promise.reject(new Error("backend said no")));

    await act(async () => {
      screen.getByRole("button", { name: "Export CSV" }).click();
      await Promise.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Export failed");
  });

  it("names the format it produces, not CSV", () => {
    renderMui(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        urlSync={false}
        features={[exportCsv<Row>({ writer: xlsxWriter() })]}
        exportCsv={{ writer: xlsxWriter() }}
      />
    );
    expect(
      screen.getByRole("button", { name: "Export XLSX" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export CSV" })).toBeNull();
  });
});
