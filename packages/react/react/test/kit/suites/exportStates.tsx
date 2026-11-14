import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { act, screen } from "@testing-library/react";
import { expect } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared `exportStates.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function exportStatesTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { DataTable, render } = kit;
  return collectConformanceTests(({ describe, it }) => {
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
      return render(
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(r) => r.id}
          urlSync={false}
          exportCsv={{ request }}
        />
      );
    }

    describe(`export states (${kit.name})`, () => {
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
    });
  });
}
