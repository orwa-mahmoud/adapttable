import { type ComposedFeature, useServerData } from "@adapttable/vue/adapter";
import type {
  ExportAllControls,
  ExportPayload,
} from "@adapttable/vue/export-csv";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, effectScope, h, KeepAlive, shallowRef } from "vue";

import { DataTable } from "../src";
import { commandPalette } from "../src/command-palette";
import { exportCsv } from "../src/export";
import { exportCsv as legacyExportCsv } from "../src/export-csv";
import { exportPdf } from "../src/export-pdf";
import { exportXlsx } from "../src/export-xlsx";
import {
  exportPdf as barrelPdf,
  exportXlsx as barrelXlsx,
} from "../src/features";
import { standardFeatures } from "../src/preset";
import {
  click,
  deferred,
  find,
  mountNative,
  part,
  tick,
  write,
} from "./filter-editing-helpers";

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
};
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing export test value");
  return value;
}

describe("public native export entries", () => {
  it("preserves CSV entry identity and exposes the same format factories from features", () => {
    expect(exportCsv).toBe(legacyExportCsv);
    expect(barrelPdf).toBe(exportPdf);
    expect(barrelXlsx).toBe(exportXlsx);
  });
});

describe.each([
  { extension: "pdf", factory: exportPdf, prefix: [37, 80, 68, 70] },
  { extension: "xlsx", factory: exportXlsx, prefix: [80, 75, 3, 4] },
])("native $extension feature", ({ extension, factory, prefix }) => {
  it("writes real format bytes, preserves filename hooks and keeps the input rows owned by the host", async () => {
    const create = vi.fn(() => "blob:export-format");
    vi.stubGlobal(
      "URL",
      class extends URL {
        static override readonly createObjectURL = create;
        static override readonly revokeObjectURL = vi.fn();
      }
    );
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push(this.download);
    });
    const files: ExportPayload[] = [];
    const after = vi.fn((result: { file: ExportPayload }) => {
      files.push(result.file);
    });
    try {
      const { host } = mountNative(() =>
        h(DataTable<Row>, {
          ...base,
          features: [
            factory<Row>({
              filename: `people.${extension}`,
              onAfterExport: after,
            }),
          ],
        })
      );
      await tick();
      expect(find(host, part("export-csv-button")).textContent).toContain(
        extension.toUpperCase()
      );
      await click(host, "export-csv-button");
      expect(after).toHaveBeenCalledOnce();
      expect(required(files[0]).mimeType).toBe(
        extension === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      const first = required(required(files[0]).parts[0]);
      const bytes =
        typeof first === "string"
          ? new TextEncoder().encode(first)
          : new Uint8Array(first as ArrayBuffer);
      expect(Array.from(bytes.slice(0, 4))).toEqual(prefix);
      expect(downloads[0]).toBe(`people.${extension}`);
      expect(create).toHaveBeenCalledOnce();
      expect(rows).toEqual([
        { id: "a", name: "Ada" },
        { id: "g", name: "Grace" },
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("preserves the effective format and disabled state in both preset override orders", async () => {
    const files: Blob[] = [];
    const downloads: string[] = [];
    vi.stubGlobal(
      "URL",
      class extends URL {
        static override readonly createObjectURL = (file: Blob) => {
          files.push(file);
          return "blob:preset-format";
        };
        static override readonly revokeObjectURL = vi.fn();
      }
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      downloads.push(this.download);
    });
    const features = shallowRef<readonly ComposedFeature<Row>[]>([
      ...standardFeatures(),
      factory(),
    ]);
    const { host } = mountNative(() =>
      h(DataTable<Row>, { ...base, features: features.value })
    );
    try {
      await tick();
      expect(host.querySelectorAll(part("export-csv-button"))).toHaveLength(1);
      expect(find(host, part("export-csv-button")).textContent).toContain(
        extension.toUpperCase()
      );
      await click(host, "export-csv-button");
      expect(required(files[0]).type).toBe(
        extension === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      expect(downloads[0]).toBe(`export.${extension}`);
      features.value = [factory(), ...standardFeatures()];
      await tick();
      expect(host.querySelectorAll(part("export-csv-button"))).toHaveLength(1);
      expect(find(host, part("export-csv-button")).textContent).toContain(
        "CSV"
      );
      await click(host, "export-csv-button");
      expect(required(files[1]).type).toBe("text/csv;charset=utf-8");
      expect(downloads[1]).toBe("export.csv");
      features.value = [...standardFeatures(), factory(false)];
      await tick();
      expect(host.querySelector(part("export-csv-button"))).toBeNull();
      features.value = [factory(false), ...standardFeatures()];
      await tick();
      expect(find(host, part("export-csv-button")).textContent).toContain(
        "CSV"
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("exposes only the current executable export to the command palette", async () => {
    const request = vi.fn();
    const format = factory<Row>({ request });
    const features = shallowRef<readonly ComposedFeature<Row>[]>([
      format,
      commandPalette({ button: true }),
    ]);
    const { host } = mountNative(() =>
      h(DataTable<Row>, { ...base, features: features.value })
    );
    await tick();
    await click(host, "command-palette-button");
    const input = find<HTMLInputElement>(host, part("command-input"));
    await write(input, "Export");
    expect(host.querySelector('[role="option"]')?.textContent).toContain(
      extension.toUpperCase()
    );
    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );
    await tick();
    expect(request).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ filename: `export.${extension}`, rows })
    );
    features.value = [factory(false), commandPalette({ button: true })];
    await tick();
    await click(host, "command-palette-button");
    await write(find<HTMLInputElement>(host, part("command-input")), "Export");
    expect(host.querySelector('[role="option"]')).toBeNull();
  });

  it("uses the current selected rows and prevents repeated export admission while busy", async () => {
    const job = deferred<void>();
    const request = vi.fn(() => job.promise);
    const selected = shallowRef<readonly string[]>(["g"]);
    const feature = factory<Row>({ scope: "selected", request });
    const { host } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        selectedIds: selected.value,
        features: [feature],
      })
    );
    await tick();
    await click(host, "export-csv-button");
    await click(host, "export-csv-button");
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ rows: [rows[1]], scope: "selected" })
    );
    selected.value = ["a"];
    job.resolve();
    await tick();
    await click(host, "export-csv-button");
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ rows: [rows[0]] })
    );
  });

  it("disables unsupported all-row scope, aborts suspended work and ignores late downloads", async () => {
    const scope = effectScope();
    const source = required(
      scope.run(() => useServerData({ rows, total: 9, urlSync: false }))
    );
    const job = deferred<{ url: string }>();
    const controls: ExportAllControls[] = [];
    const shown = shallowRef(true);
    const features = shallowRef([factory<Row>({ scope: "all" })]);
    const Table = defineComponent({
      setup: () => () =>
        h(DataTable<Row>, {
          ...base,
          data: undefined,
          source: source.value,
          features: features.value,
        }),
    });
    const { host, stop } = mountNative(() =>
      h(KeepAlive, null, { default: () => (shown.value ? h(Table) : null) })
    );
    try {
      await tick();
      expect(
        find<HTMLButtonElement>(host, part("export-csv-button")).disabled
      ).toBe(true);
      expect(
        find<HTMLButtonElement>(host, part("export-csv-button")).title
      ).toBeTruthy();
      features.value = [
        factory<Row>({
          scope: "all",
          onExportAll: (_query, control) => {
            controls.push(control);
            return job.promise;
          },
        }),
      ];
      await tick();
      await click(host, "export-csv-button");
      required(controls[0]).setProgress?.(25);
      await tick();
      expect(find<HTMLProgressElement>(host, "progress").value).toBe(25);
      shown.value = false;
      await tick();
      expect(required(controls[0]).signal.aborted).toBe(true);
      job.resolve({ url: `/late.${extension}` });
      shown.value = true;
      await tick();
      expect(host.querySelector("a[download]")).toBeNull();
      expect(
        find<HTMLButtonElement>(host, part("export-csv-button")).disabled
      ).toBe(false);
    } finally {
      stop();
      scope.stop();
    }
  });

  it("aborts source-replaced work, retries failures and restores local focus", async () => {
    const scope = effectScope();
    const first = required(
      scope.run(() => useServerData({ rows, total: 9, urlSync: false }))
    );
    const second = required(
      scope.run(() => useServerData({ rows, total: 12, urlSync: false }))
    );
    const source = shallowRef(first.value);
    const jobs = [
      deferred<{ url: string }>(),
      deferred<{ url: string }>(),
      deferred<{ url: string }>(),
    ];
    const controls: ExportAllControls[] = [];
    const feature = factory<Row>({
      scope: "all",
      onExportAll: (_query, control) => {
        controls.push(control);
        return required(jobs[controls.length - 1]).promise;
      },
    });
    const { host, stop } = mountNative(() =>
      h(DataTable<Row>, {
        ...base,
        data: undefined,
        source: source.value,
        features: [feature],
      })
    );
    try {
      await tick();
      await click(host, "export-csv-button");
      source.value = second.value;
      await tick();
      expect(required(controls[0]).signal.aborted).toBe(true);
      required(jobs[0]).resolve({ url: `/old.${extension}` });
      await tick();
      expect(host.querySelector("a[download]")).toBeNull();
      await click(host, "export-csv-button");
      required(jobs[1]).reject(new Error("Try again"));
      await tick();
      expect(host.textContent).toContain("Try again");
      await click(host, "export-progress-retry");
      required(jobs[2]).resolve({ url: `/current.${extension}` });
      await tick();
      expect(
        find<HTMLAnchorElement>(host, "a[download]").getAttribute("href")
      ).toBe(`/current.${extension}`);
      await click(host, "export-progress-dismiss");
      expect(document.activeElement).toBe(
        find(host, part("export-csv-button"))
      );
    } finally {
      stop();
      scope.stop();
    }
  });

  it("aborts an active job when the format feature is removed", async () => {
    const job = deferred<{ url: string }>();
    let controls: ExportAllControls | undefined;
    const features = shallowRef<readonly ComposedFeature<Row>[]>([
      factory<Row>({
        scope: "all",
        onExportAll: (_query, control) => {
          controls = control;
          return job.promise;
        },
      }),
    ]);
    const { host } = mountNative(() =>
      h(DataTable<Row>, { ...base, features: features.value })
    );
    await tick();
    await click(host, "export-csv-button");
    features.value = [];
    await tick();
    expect(required(controls).signal.aborted).toBe(true);
    job.resolve({ url: `/removed.${extension}` });
    await tick();
    expect(host.querySelector(part("export-csv-button"))).toBeNull();
    expect(host.querySelector("a[download]")).toBeNull();
  });
});
