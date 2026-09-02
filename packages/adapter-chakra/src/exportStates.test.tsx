import { xlsxWriter } from "@adapttable/core/xlsx";
import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderChakra } from "./test-utils";

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
  return renderChakra(
    <DataTable
      data={rows}
      columns={columns}
      rowKey={(r) => r.id}
      urlSync={false}
      exportCsv={{ request }}
    />
  );
}

describe("export states (Chakra)", () => {
  it("renders server progress and cancels through the host signal", async () => {
    let signal: AbortSignal | undefined;
    const { container } = renderChakra(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        urlSync={false}
        exportCsv={{
          scope: "all",
          onExportAll: (_query, controls) =>
            new Promise<void>(() => {
              signal = controls.signal;
              controls.setProgress?.(55);
              controls.setMessage?.("Building file");
            }),
        }}
      />
    );

    await act(async () => {
      screen.getByRole("button", { name: "Export CSV" }).click();
      await Promise.resolve();
    });
    expect(
      screen.getByRole("region", { name: "Preparing export" })
    ).toHaveTextContent("Building file");
    expect(
      container.querySelector('[data-adapttable-part="export-progress-bar"]')
    ).not.toBeNull();

    screen.getByRole("button", { name: "Cancel" }).click();
    expect(signal?.aborted).toBe(true);
  });

  it("shows Chakra's own loading affordance while the export runs", async () => {
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
    // Chakra's own loading Button: its Spinner takes the label's place and the
    // control blocks itself.
    expect(button).toBeDisabled();
    expect(container.querySelector(".chakra-spinner")).not.toBeNull();

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
    renderChakra(
      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        urlSync={false}
        exportCsv={{ writer: xlsxWriter() }}
      />
    );
    expect(
      screen.getByRole("button", { name: "Export XLSX" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export CSV" })).toBeNull();
  });
});
