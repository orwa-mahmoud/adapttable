import type { ExportAllControls } from "@adapttable/vue";
import { h } from "vue";

import { DataTable } from "../src";
import { bulkActions } from "../src/bulk-actions";
import { exportCsv } from "../src/export";
import { print } from "../src/print";
import { click, deferred, find, mount, part, tick } from "./editing-helpers";

const rows = [
  { id: "a", name: "Ada" },
  { id: "g", name: "Grace" },
];
type Row = (typeof rows)[number];
const base = {
  data: rows,
  columns: [{ key: "name" }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
};

it("keeps omitted utility controls absent", async () => {
  const { host } = mount(() => h(DataTable<Row>, base));
  await tick();
  expect(
    host.querySelector(
      `${part("bulk-bar")},${part("print-button")},${part("export-csv-button")}`
    )
  ).toBeNull();
});

it("runs one native bulk request, exposes rejection, and retains host rows", async () => {
  const pending = deferred<void>();
  const request = vi
    .fn()
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValue(undefined);
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      selectable: true,
      defaultSelectedIds: ["a"],
      features: [
        bulkActions([
          { key: "archive", label: "Archive selected", onClick: request },
        ]),
      ],
    })
  );
  await tick();
  const button = find<HTMLButtonElement>(host, part("bulk-button"));
  expect(button.classList.contains("n-button")).toBe(true);
  button.click();
  button.click();
  await tick();
  expect(request).toHaveBeenCalledOnce();
  expect(request.mock.calls[0]?.[0]).toEqual(["a"]);
  expect(button.disabled).toBe(true);
  pending.reject(new Error("Host refused"));
  await tick();
  expect(find(host, part("bulk-error")).textContent).toContain("Host refused");
  expect(button.disabled).toBe(false);
  await click(host, "bulk-button");
  expect(request).toHaveBeenCalledTimes(2);
  expect(host.querySelector(part("bulk-bar"))).toBeNull();
  expect(rows).toHaveLength(2);
});

it("exports selected rows and invokes the host print handler", async () => {
  const request = vi.fn();
  const printed = vi.fn();
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      selectedIds: ["g"],
      features: [
        exportCsv<Row>({ scope: "selected", request }),
        print(printed, true),
      ],
    })
  );
  await tick();
  expect(
    find(host, part("export-csv-button")).classList.contains("n-button")
  ).toBe(true);
  await click(host, "export-csv-button");
  expect(request).toHaveBeenCalledWith(
    expect.objectContaining({ scope: "selected", rows: [rows[1]] })
  );
  await click(host, "print-button");
  expect(printed).toHaveBeenCalledOnce();
});

it("shows unknown and numeric native progress, cancels stale results, and restores export focus", async () => {
  const pending = deferred<{ url: string }>();
  let control: ExportAllControls | undefined;
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      features: [
        exportCsv<Row>({
          scope: "all",
          onExportAll: (_query, next) => {
            control = next;
            return pending.promise;
          },
        }),
      ],
    })
  );
  await tick();
  const trigger = find<HTMLButtonElement>(host, part("export-csv-button"));
  trigger.focus();
  await click(host, "export-csv-button");
  expect(find(host, '[role="progressbar"]').hasAttribute("aria-valuenow")).toBe(
    false
  );
  if (!control) throw new Error("The export controller was not provided");
  control.setProgress?.(42);
  control.setMessage?.("42 rows");
  await tick();
  expect(find(host, '[role="progressbar"]').getAttribute("aria-valuenow")).toBe(
    "42"
  );
  expect(host.textContent).toContain("42 rows");
  await click(host, "export-progress-cancel");
  expect(control.signal.aborted).toBe(true);
  pending.resolve({ url: "/stale.csv" });
  await tick();
  expect(host.querySelector("a[download]")).toBeNull();
  await click(host, "export-progress-dismiss");
  expect(document.activeElement).toBe(trigger);
});

it("offers the finished export as a download and reports a failed one", async () => {
  const outcome = deferred<{ url: string }>();
  const { host } = mount(() =>
    h(DataTable<Row>, {
      ...base,
      features: [
        exportCsv<Row>({ scope: "all", onExportAll: () => outcome.promise }),
      ],
    })
  );
  await tick();
  await click(host, "export-csv-button");
  outcome.resolve({ url: "/people.csv" });
  await tick();
  const download = await vi.waitFor(() =>
    find<HTMLAnchorElement>(host, part("export-progress-download"))
  );
  expect(download.getAttribute("href")).toBe("/people.csv");
  expect(download.hasAttribute("download")).toBe(true);
  await click(host, "export-progress-dismiss");

  const failure = deferred<{ url: string }>();
  const failed = mount(() =>
    h(DataTable<Row>, {
      ...base,
      features: [
        exportCsv<Row>({ scope: "all", onExportAll: () => failure.promise }),
      ],
    })
  );
  await tick();
  await click(failed.host, "export-csv-button");
  failure.reject(new Error("Server unavailable"));
  await tick();
  const alert = await vi.waitFor(() => find(failed.host, '[role="alert"]'));
  expect(alert.textContent).toContain("Server unavailable");
  expect(find(failed.host, part("export-progress-retry"))).toBeTruthy();
});
