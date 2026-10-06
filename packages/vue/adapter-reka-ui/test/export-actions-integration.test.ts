import type { ConfirmRequest, ExportAllControls } from "@adapttable/vue";
import { afterEach, expect, it, vi } from "vitest";
import { createApp, h, nextTick, shallowRef } from "vue";

import { DataTable, type DataTableProps } from "../src";
import { bulkActions } from "../src/bulk-actions";
import { exportCsv } from "../src/export-csv";
import { print } from "../src/print";

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
];
const stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  document.body.replaceChildren();
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function mount(options: () => Partial<DataTableProps<Row>>) {
  const host = document.createElement("div");
  document.body.append(host);
  const app = createApp({
    render: () =>
      h(DataTable<Row>, {
        data: rows,
        columns: [{ key: "name" }],
        rowKey: (row) => row.id,
        urlSync: false,
        forceMobile: false,
        ...options(),
      }),
  });
  app.mount(host);
  stops.push(() => app.unmount());
  return host;
}
function part<T extends HTMLElement>(root: ParentNode, name: string): T {
  const target = root.querySelector<T>(`[data-adapttable-part="${name}"]`);
  if (!target) throw new Error(`Missing ${name}`);
  return target;
}
async function flush() {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 10));
  await nextTick();
}
it("exports the current controlled selection and keeps print host-owned", async () => {
  const job = deferred<void>();
  const request = vi.fn(() => job.promise);
  const printed = vi.fn();
  const selected = shallowRef<readonly string[]>(["b"]);
  const features = [
    exportCsv<Row>({ scope: "selected", request }),
    print(printed, true),
  ];
  const host = mount(() => ({ selectedIds: selected.value, features }));
  await flush();
  part(host, "export-csv-button").click();
  await flush();
  expect(request).toHaveBeenCalledWith(
    expect.objectContaining({ scope: "selected", rows: [rows[1]] })
  );
  expect(part<HTMLButtonElement>(host, "export-csv-button").disabled).toBe(
    true
  );
  part(host, "print-button").click();
  expect(printed).toHaveBeenCalledTimes(1);
  job.resolve();
  await flush();
  expect(part(host, "export-announcer").textContent).toContain(
    "Export complete"
  );
  selected.value = ["a"];
  await flush();
  part(host, "export-csv-button").click();
  await flush();
  expect(request).toHaveBeenLastCalledWith(
    expect.objectContaining({ rows: [rows[0]] })
  );
});
it("uses Reka Progress for server jobs, cancels stale completion and retries a failed job", async () => {
  const first = deferred<{ url: string }>();
  const retry = deferred<{ url: string }>();
  const controls: ExportAllControls[] = [];
  const request = vi.fn((_query: unknown, control: ExportAllControls) => {
    controls.push(control);
    if (controls.length === 1) return first.promise;
    if (controls.length === 2) return Promise.reject(new Error("Try again"));
    return retry.promise;
  });
  const features = [exportCsv<Row>({ scope: "all", onExportAll: request })];
  const host = mount(() => ({ features }));
  await flush();
  part(host, "export-csv-button").click();
  await flush();
  controls[0]?.setProgress?.(36);
  controls[0]?.setMessage?.("36 rows");
  await flush();
  const progress = part(host, "export-progress-bar");
  expect(progress.getAttribute("role")).toBe("progressbar");
  expect(progress.getAttribute("aria-valuenow")).toBe("36");
  expect(host.textContent).toContain("36 rows");
  part(host, "export-progress-cancel").click();
  await flush();
  expect(controls[0]?.signal.aborted).toBe(true);
  first.resolve({ url: "/stale.csv" });
  await flush();
  expect(host.querySelector("a[download]")).toBeNull();
  part(host, "export-progress-dismiss").click();
  await flush();
  expect(document.activeElement).toBe(part(host, "export-csv-button"));
  part(host, "export-csv-button").click();
  await flush();
  expect(host.textContent).toContain("Try again");
  part(host, "export-progress-retry").click();
  await flush();
  retry.resolve({ url: "/ready.csv" });
  await flush();
  expect(
    part<HTMLAnchorElement>(host, "export-progress-download").getAttribute(
      "href"
    )
  ).toBe("/ready.csv");
});
it("runs a bulk action only after the host confirms and never mutates host rows", async () => {
  let confirmation: ConfirmRequest | undefined;
  const job = deferred<void>();
  const run = vi.fn(() => job.promise);
  const features = [
    bulkActions([
      {
        key: "archive",
        label: "Archive",
        onClick: run,
        confirm: {
          title: "Archive rows",
          message: () => "Archive the selected row?",
          confirmLabel: "Archive",
        },
      },
    ]),
  ];
  const host = mount(() => ({
    features,
    selectable: true,
    defaultSelectedIds: ["a"],
    confirm: (request) => {
      confirmation = request;
    },
  }));
  await flush();
  part(host, "bulk-button").click();
  await flush();
  expect(run).not.toHaveBeenCalled();
  expect(confirmation?.title).toBe("Archive rows");
  confirmation?.onConfirm();
  await flush();
  expect(run).toHaveBeenCalledWith(
    ["a"],
    expect.objectContaining({ allMatching: false })
  );
  expect(part<HTMLButtonElement>(host, "bulk-button").disabled).toBe(true);
  job.resolve();
  await flush();
  expect(rows.map((row) => row.id)).toEqual(["a", "b"]);
});
