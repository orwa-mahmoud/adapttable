import {
  type BulkAction,
  type ConfirmHandler,
  type ExportAllControls,
  useFrontendData,
  useServerData,
} from "@adapttable/vue";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, effectScope, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../src";
import { bulkActions } from "../src/bulk-actions";
import { exportCsv } from "../src/export";
import { print } from "../src/print";
import {
  click,
  deferred,
  find,
  mountNuxt,
  part,
  tick,
} from "./actions.helpers";
const rows = [
  { id: "a", name: "Ada" },
  { id: "g", name: "Grace" },
];
type Row = (typeof rows)[number];
const base = {
  data: rows,
  columns: [{ key: "name", sortable: true }],
  rowKey: (row: Row) => row.id,
  urlSync: false,
  searchable: false,
  forceMobile: false,
};
function at<T>(values: ArrayLike<T>, index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`Missing item ${index}`);
  return value;
}
function server() {
  const scope = effectScope();
  const source = scope.run(() =>
    useServerData({ rows, total: 9, urlSync: false })
  );
  if (!source) throw new Error("No source");
  return { source, stop: () => scope.stop() };
}
describe("genuine Nuxt action controls", () => {
  it("keeps the base table free of optional action controls", async () => {
    const { host } = mountNuxt(() => h(DataTable<Row>, base));
    await tick();
    expect(
      host.querySelector(
        `${part("bulk-bar")},${part("command-palette-button")},${part("print-button")},${part("export-csv-button")}`
      )
    ).toBeNull();
  });
  it("runs bulk actions against current selection and all matching rows after host confirmation", async () => {
    const scope = effectScope();
    const source = scope.run(() =>
      useFrontendData({
        data: [
          ...rows,
          ...Array.from({ length: 7 }, (_, i) => ({
            id: `x${i}`,
            name: `Other ${i}`,
          })),
        ],
        columns: base.columns,
        defaults: { limit: 2 },
        urlSync: false,
      })
    );
    if (!source) throw new Error("No source");
    const remote = { source, stop: () => scope.stop() };
    const done = deferred<void>();
    const run = vi.fn(() => done.promise);
    let confirmation: Parameters<ConfirmHandler>[0] | undefined;
    const action: BulkAction = {
      key: "delete",
      label: "Delete selected",
      onClick: run,
      confirm: {
        title: "Delete",
        message: (count) => `Delete ${count}`,
        confirmLabel: "Delete",
        danger: true,
      },
    };
    const { host, stop } = mountNuxt(() =>
      h(DataTable<Row>, {
        ...base,
        data: undefined,
        source: remote.source.value,
        selectable: true,
        confirm: (request) => {
          confirmation = request;
        },
        features: [bulkActions([action])],
      })
    );
    await tick();
    find<HTMLButtonElement>(host, 'thead button[role="checkbox"]').click();
    await tick();
    expect(find(host, part("select-all-banner")).textContent).toContain("9");
    await click(host, "select-all-button");
    await click(host, "bulk-button");
    expect(run).not.toHaveBeenCalled();
    expect(confirmation?.message).toBe("Delete 9");
    confirmation?.onConfirm();
    await tick();
    expect(run).toHaveBeenCalledWith(["a", "g"], {
      allMatching: true,
      total: 9,
    });
    expect(find<HTMLButtonElement>(host, part("bulk-button")).disabled).toBe(
      true
    );
    done.resolve();
    await tick();

    expect(host.querySelector(part("bulk-bar"))).toBeNull();
    stop();
    remote.stop();
  });
  it("shows disabled reasons and bulk rejection while the host retains its rows", async () => {
    let disabled = true;
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error("Host refused"))
      .mockResolvedValue(undefined);
    const action: BulkAction = {
      key: "run",
      label: "Run",
      onClick: run,
      disabledReason: () => (disabled ? "Blocked by host" : undefined),
    };
    const features = shallowRef([bulkActions([action])]);
    const { host } = mountNuxt(() =>
      h(DataTable<Row>, {
        ...base,
        selectable: true,
        defaultSelectedIds: ["a"],
        features: features.value,
      })
    );
    await tick();
    expect(find<HTMLButtonElement>(host, part("bulk-button")).title).toBe(
      "Blocked by host"
    );
    expect(find<HTMLButtonElement>(host, part("bulk-button")).disabled).toBe(
      true
    );
    disabled = false;
    features.value = [bulkActions([{ ...action }])];
    await tick();
    await click(host, "bulk-button");
    expect(find(host, part("bulk-error")).textContent).toContain(
      "Host refused"
    );
    await click(host, "bulk-button");
    expect(run).toHaveBeenCalledTimes(2);
    expect(host.querySelector(part("bulk-error"))).toBeNull();
    expect(rows).toHaveLength(2);
  });
  it("exports current selection through host callbacks and keeps print host-owned", async () => {
    const job = deferred<void>();
    const requests: unknown[] = [];
    const request = vi.fn((info: unknown) => {
      requests.push(info);
      return job.promise;
    });
    const printed = vi.fn();
    const selected = shallowRef<readonly string[]>(["g"]);
    const { host } = mountNuxt(() =>
      h(DataTable<Row>, {
        ...base,
        selectedIds: selected.value,
        features: [
          exportCsv<Row>({ scope: "selected", request }),
          print(printed, true),
        ],
      })
    );
    await tick();
    await click(host, "export-csv-button");
    expect(requests[0]).toMatchObject({ scope: "selected", rows: [rows[1]] });
    expect(
      find<HTMLButtonElement>(host, part("export-csv-button")).disabled
    ).toBe(true);
    await click(host, "print-button");
    expect(printed).toHaveBeenCalledOnce();
    job.resolve();
    await tick();
    expect(find(host, part("export-announcer")).textContent).toContain(
      "Export complete"
    );
    selected.value = ["a"];
    await tick();
    await click(host, "export-csv-button");
    expect(requests[1]).toMatchObject({ scope: "selected", rows: [rows[0]] });
  });
  it("reports server progress, cancels stale results, retries failures and returns focus locally", async () => {
    const jobs = [
      deferred<{ url: string }>(),
      deferred<{ url: string }>(),
      deferred<{ url: string }>(),
    ];
    let n = 0;
    const controls: ExportAllControls[] = [];
    const { host } = mountNuxt(() =>
      h(DataTable<Row>, {
        ...base,
        classNames: { exportProgressBar: "native-progress-paint" },
        labels: {
          exportStarted: "Preparing report",
          exportProgress: (value) => "Report " + value + "%",
        },
        features: [
          exportCsv<Row>({
            scope: "all",
            onExportAll: (_query, control) => {
              controls.push(control);
              return at(jobs, n++).promise;
            },
          }),
        ],
      })
    );
    await tick();
    await click(host, "export-csv-button");
    const progress = find<HTMLProgressElement>(
      host,
      part("export-progress-bar")
    );
    expect(progress).toBeInstanceOf(HTMLProgressElement);
    expect(progress.getAttribute("data-adapttable-part")).toBe(
      "export-progress-bar"
    );
    expect(host.querySelectorAll(part("export-progress-bar"))).toHaveLength(1);
    expect(progress.classList.contains("native-progress-paint")).toBe(true);
    expect(progress.max).toBe(100);
    expect(progress.hasAttribute("value")).toBe(false);
    expect(progress.position).toBe(-1);
    expect(progress.getAttribute("aria-label")).toBe("Preparing report");
    at(controls, 0).setProgress?.(0);
    await tick();
    expect(find(host, part("export-progress-bar"))).toBe(progress);
    expect(progress.hasAttribute("value")).toBe(true);
    expect(progress.value).toBe(0);
    expect(progress.position).toBe(0);
    expect(progress.getAttribute("aria-label")).toBe("Report 0%");
    at(controls, 0).setProgress?.(36);
    at(controls, 0).setMessage?.("36 rows");
    await tick();
    expect(progress.value).toBe(36);
    expect(progress.position).toBeCloseTo(0.36);
    expect(progress.getAttribute("data-adapttable-part")).toBe(
      "export-progress-bar"
    );
    expect(progress.getAttribute("aria-label")).toBe("Report 36%");
    const spinner = find<SVGElement>(host, part("export-spinner"));
    expect(spinner.tagName.toLowerCase()).toBe("svg");
    expect(spinner.getAttribute("viewBox")).toBe("0 0 24 24");
    expect(spinner.querySelector("path")).not.toBeNull();
    expect(host.textContent).toContain("36 rows");
    at(controls, 0).setProgress?.(100);
    await tick();
    expect(progress.value).toBe(100);
    expect(progress.position).toBe(1);
    expect(progress.getAttribute("aria-label")).toBe("Report 100%");
    await click(host, "export-progress-cancel");
    expect(at(controls, 0).signal.aborted).toBe(true);
    at(jobs, 0).resolve({ url: "/stale.csv" });
    await tick();
    expect(host.querySelector("a[download]")).toBeNull();
    await click(host, "export-progress-dismiss");
    expect(document.activeElement).toBe(find(host, part("export-csv-button")));
    await click(host, "export-csv-button");
    at(jobs, 1).reject(new Error("Backend unavailable"));
    await tick();
    expect(host.textContent).toContain("Backend unavailable");
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining(
        "exportCsv.onExportAll rejected, so no export happened. The table exposed the failure and a retry when available. Reason: Error: Backend unavailable"
      )
    );
    vi.mocked(console.warn).mockClear();
    await click(host, "export-progress-retry");
    at(jobs, 2).resolve({ url: "/report.csv" });
    await tick();
    expect(
      find<HTMLAnchorElement>(host, "a[download]").getAttribute("href")
    ).toBe("/report.csv");
    await click(host, "export-progress-dismiss");
    expect(host.querySelector(part("export-progress-surface"))).toBeNull();
  });
  it("disables unsupported all-row export and aborts jobs through KeepAlive", async () => {
    const remote = server();
    const busy = deferred<{ url: string }>();
    const controls: ExportAllControls[] = [];
    const shown = shallowRef(true);
    const features = shallowRef([exportCsv<Row>({ scope: "all" })]);
    const Table = defineComponent({
      setup: () => () =>
        h(DataTable<Row>, {
          ...base,
          data: undefined,
          source: remote.source.value,
          features: features.value,
        }),
    });
    const { host, stop } = mountNuxt(() =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Table) : null) })
    );
    await tick();
    expect(
      find<HTMLButtonElement>(host, part("export-csv-button")).disabled
    ).toBe(true);
    expect(
      find<HTMLButtonElement>(host, part("export-csv-button")).title
    ).toBeTruthy();
    features.value = [
      exportCsv<Row>({
        scope: "all",
        onExportAll: (_query, control) => {
          controls.push(control);
          return busy.promise;
        },
      }),
    ];
    await tick();
    await click(host, "export-csv-button");
    shown.value = false;
    await tick();
    expect(at(controls, 0).signal.aborted).toBe(true);
    busy.resolve({ url: "/late.csv" });
    await tick();
    shown.value = true;
    await tick();
    expect(host.querySelector("a[download]")).toBeNull();
    expect(
      find<HTMLButtonElement>(host, part("export-csv-button")).disabled
    ).toBe(false);
    stop();
    remote.stop();
  });
});

it.each([false, true])(
  "keeps selection rejection and kit classes controlled (mobile=%s)",
  async (forceMobile) => {
    const requested = vi.fn();
    const printed = vi.fn();
    const { host } = mountNuxt(() =>
      h(DataTable<Row>, {
        ...base,
        forceMobile,
        dir: "rtl",
        selectable: true,
        selectedIds: [],
        "onUpdate:selectedIds": requested,
        classNames: {
          printButton: "print-paint",
          exportCsvButton: "export-paint",
        },
        features: [
          bulkActions([{ key: "run", label: "Run", onClick: vi.fn() }]),
          print(printed, true),
          exportCsv<Row>({ request: vi.fn() }),
        ],
      })
    );
    await tick();
    const checkbox = find<HTMLButtonElement>(host, '[role="checkbox"]');
    checkbox.click();
    await tick();
    expect(requested).toHaveBeenCalledOnce();
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(host.querySelector(part("bulk-bar"))).toBeNull();
    const printButton = find(host, part("print-button"));
    expect(printButton.classList.contains("print-paint")).toBe(true);
    expect(printButton.getAttribute("data-slot")).toBe("base");
    expect(
      find(host, part("export-csv-button")).classList.contains("export-paint")
    ).toBe(true);
    await click(host, "print-button");
    expect(printed).toHaveBeenCalledOnce();
  }
);

it("keeps explicit false export and a command-only print feature inert in the toolbar", async () => {
  const run = vi.fn();
  const { host } = mountNuxt(() =>
    h(DataTable<Row>, {
      ...base,
      features: [exportCsv(false), print(run), bulkActions([])],
    })
  );
  await tick();
  expect(host.querySelector(part("export-csv-button"))).toBeNull();
  expect(host.querySelector(part("print-button"))).toBeNull();
  expect(host.querySelector(part("bulk-bar"))).toBeNull();
  expect(run).not.toHaveBeenCalled();
});
