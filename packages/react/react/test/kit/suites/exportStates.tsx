import { csvWriter, deferredExportWriter } from "@adapttable/core";
import { type ExportWriter } from "@adapttable/core/binding";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { type ColumnDef } from "@adapttable/react";
import { act, screen } from "@testing-library/react";
import { expect, vi } from "vitest";

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

    function renderLongExport(
      onExportAll: NonNullable<
        Extract<
          Parameters<typeof DataTable<Row>>[0]["exportCsv"],
          { onExportAll?: unknown }
        >["onExportAll"]
      >
    ) {
      return render(
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(r) => r.id}
          urlSync={false}
          exportCsv={{ scope: "all", onExportAll }}
        />
      );
    }

    async function startExport() {
      await act(async () => {
        screen.getByRole("button", { name: "Export CSV" }).click();
        await Promise.resolve();
      });
    }

    function part(name: string): HTMLElement | null {
      return document.querySelector<HTMLElement>(
        `[data-adapttable-part="${name}"]`
      );
    }

    describe(`long export states (${kit.name})`, () => {
      it("shows a working bar before the host knows how far it is", async () => {
        renderLongExport(() => new Promise<void>(() => undefined));
        await startExport();
        expect(
          screen.getByRole("region", { name: "Preparing export" })
        ).toBeInTheDocument();
        expect(part("export-progress-bar")).not.toBeNull();
      });

      it("says why a long export failed and runs it again on retry", async () => {
        const run = vi.fn(() => Promise.reject(new Error("backend said no")));
        renderLongExport(run);
        await startExport();
        await vi.waitFor(() => {
          expect(part("export-progress-message")).toHaveTextContent(
            "backend said no"
          );
        });
        const retry = part("export-progress-retry");
        expect(retry).not.toBeNull();
        await act(async () => {
          retry!.click();
          await Promise.resolve();
        });
        expect(run).toHaveBeenCalledTimes(2);
      });

      it("offers the finished file the host hands back", async () => {
        renderLongExport(() =>
          Promise.resolve({ url: "https://files.example.test/people.csv" })
        );
        await startExport();
        await vi.waitFor(() => {
          expect(part("export-progress-download")).not.toBeNull();
        });
        expect(part("export-progress-download")).toHaveAttribute(
          "href",
          "https://files.example.test/people.csv"
        );
        expect(part("export-progress-download")).toHaveTextContent(
          "Download export"
        );
      });
    });

    describe(`writers that load on demand (${kit.name})`, () => {
      function renderWith(
        writer: ExportWriter | ReturnType<typeof deferredExportWriter>
      ) {
        return render(
          <DataTable
            data={rows}
            columns={columns}
            rowKey={(r) => r.id}
            urlSync={false}
            exportCsv={{ writer }}
          />
        );
      }

      function downloads() {
        return vi
          .spyOn(HTMLAnchorElement.prototype, "click")
          .mockImplementation(() => undefined);
      }

      it("starts loading the writer once the table is mounted", async () => {
        const load = vi.fn(() => Promise.resolve(csvWriter));
        renderWith(deferredExportWriter("csv", load));
        await vi.waitFor(() => {
          expect(load).toHaveBeenCalledTimes(1);
        });
      });

      it("waits for a writer still loading, then downloads", async () => {
        const click = downloads();
        let finish: ((writer: ExportWriter) => void) | undefined;
        const load = vi.fn(
          () =>
            new Promise<ExportWriter>((resolve) => {
              finish = resolve;
            })
        );
        renderWith(deferredExportWriter("csv", load));
        await startExport();
        expect(click).not.toHaveBeenCalled();
        await act(async () => {
          finish?.(csvWriter);
          await Promise.resolve();
        });
        await vi.waitFor(() => {
          expect(click).toHaveBeenCalledTimes(1);
        });
        expect(screen.getByRole("status")).toHaveTextContent("Export complete");
        click.mockRestore();
      });

      it("reports a writer that cannot load and loads it again on the next export", async () => {
        const click = downloads();
        const load = vi
          .fn<() => Promise<ExportWriter>>()
          .mockRejectedValueOnce(new Error("offline"))
          .mockRejectedValueOnce(new Error("offline"))
          .mockResolvedValue(csvWriter);
        renderWith(deferredExportWriter("csv", load));
        await vi.waitFor(() => {
          expect(load).toHaveBeenCalledTimes(1);
        });
        await startExport();
        await vi.waitFor(() => {
          expect(screen.getByRole("status")).toHaveTextContent("Export failed");
        });
        expect(click).not.toHaveBeenCalled();
        // By part: a kit's loading icon can linger in the button's name while
        // its exit animation runs.
        const button = part("export-csv-button");
        expect(button).not.toBeDisabled();
        await act(async () => {
          button?.click();
          await Promise.resolve();
        });
        await vi.waitFor(() => {
          expect(click).toHaveBeenCalledTimes(1);
        });
        expect(load).toHaveBeenCalledTimes(3);
        click.mockRestore();
      });

      it("downloads at once with a writer that builds at once", async () => {
        const click = downloads();
        const idle = vi.fn();
        vi.stubGlobal("requestIdleCallback", idle);
        renderWith(csvWriter);
        await startExport();
        expect(click).toHaveBeenCalledTimes(1);
        expect(idle).not.toHaveBeenCalled();
        vi.unstubAllGlobals();
        click.mockRestore();
      });
    });

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
