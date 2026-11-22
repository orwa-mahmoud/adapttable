import { afterEach, describe, expect, it, vi } from "vitest";

import { coreExportCsv } from "../features/coreFeatures";
import type { TableSource } from "../source/TableSource";
import {
  deferredExportWriter,
  deferredPdfWriter,
  deferredXlsxWriter,
  isDeferredExportWriter,
} from "./deferredWriter";
import type { ExportWriter } from "./exportWriter";
import { makeExportCsvHandler } from "./tableCsv";

const BUILT: ExportWriter = {
  extension: "txt",
  build: ({ table }) => ({
    parts: [table.rows.map((row) => row.join(",")).join("\n")],
    mimeType: "text/plain",
    text: "",
  }),
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("deferredExportWriter", () => {
  it("loads once and shares the load", async () => {
    const loader = vi.fn(() => Promise.resolve(BUILT));
    const writer = deferredExportWriter("txt", loader);
    expect(isDeferredExportWriter(writer)).toBe(true);
    expect(isDeferredExportWriter(BUILT)).toBe(false);
    const [first, second] = await Promise.all([writer.load(), writer.load()]);
    expect(first).toBe(BUILT);
    expect(second).toBe(BUILT);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("forgets a failed load, so the next call tries again", async () => {
    const loader = vi
      .fn<() => Promise<ExportWriter>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(BUILT);
    const writer = deferredExportWriter("txt", loader);
    await expect(writer.load()).rejects.toThrow("offline");
    await expect(writer.load()).resolves.toBe(BUILT);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("loads core's Excel and PDF builders on demand", async () => {
    const xlsx = await deferredXlsxWriter().load();
    const pdf = await deferredPdfWriter().load();
    expect(xlsx.extension).toBe("xlsx");
    expect(typeof xlsx.build).toBe("function");
    expect(pdf.extension).toBe("pdf");
    expect(typeof pdf.build).toBe("function");
  });
});

describe("preloading a deferred writer", () => {
  it("loads a deferred writer once the browser is idle", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    const loader = vi.fn(() => Promise.resolve(BUILT));
    deferredExportWriter("txt", loader).preload();
    expect(loader).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("uses the idle callback when the browser has one, and cancels it", () => {
    const request = vi.fn((callback: () => void) => {
      callback();
      return 7;
    });
    const cancel = vi.fn();
    vi.stubGlobal("requestIdleCallback", request);
    vi.stubGlobal("cancelIdleCallback", cancel);
    const loader = vi.fn(() => Promise.resolve(BUILT));
    const stop = deferredExportWriter("txt", loader).preload();
    expect(loader).toHaveBeenCalledTimes(1);
    stop();
    expect(cancel).toHaveBeenCalledWith(7);
  });

  it("starts from the export feature's mount, and only for a deferred writer", () => {
    vi.useFakeTimers();
    const host = { registerWriter: vi.fn() };
    const loader = vi.fn(() => Promise.resolve(BUILT));
    const deferred = coreExportCsv({
      writer: deferredExportWriter("txt", loader),
    });
    deferred.setup?.(host as never);
    vi.runAllTimers();
    expect(loader).not.toHaveBeenCalled();
    const stop = deferred.mount?.();
    vi.runAllTimers();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(typeof stop).toBe("function");

    const built = coreExportCsv({ writer: BUILT });
    built.setup?.(host as never);
    expect(built.mount).toBeUndefined();
    expect(host.registerWriter).toHaveBeenCalledTimes(2);
  });
});

describe("an export with a deferred writer", () => {
  const rows = [{ id: "1", name: "Ada" }];
  const columns = [{ key: "name" }];

  function handlerWith(
    writer: ReturnType<typeof deferredExportWriter>,
    onAfterExport = vi.fn()
  ) {
    // The page the reader sees is all a page export reads.
    const source = { rows, total: rows.length, page: 1, limit: 25 };
    const handler = makeExportCsvHandler(
      { writer, onAfterExport },
      source as unknown as TableSource<(typeof rows)[number]>,
      columns
    );
    if (!handler) throw new Error("export handler missing");
    return { handler, onAfterExport };
  }

  it("waits for the builder, then downloads and reports the file", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const { handler, onAfterExport } = handlerWith(
      deferredExportWriter("txt", () => Promise.resolve(BUILT))
    );
    const result = handler();
    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(click).toHaveBeenCalledTimes(1);
    expect(onAfterExport).toHaveBeenCalledWith(
      expect.objectContaining({ filename: "export.txt" })
    );
  });

  it("rejects without a download or onAfterExport when the load fails", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const { handler, onAfterExport } = handlerWith(
      deferredExportWriter("txt", () => Promise.reject(new Error("offline")))
    );
    await expect(handler()).rejects.toThrow("offline");
    expect(click).not.toHaveBeenCalled();
    expect(onAfterExport).not.toHaveBeenCalled();
  });
});

describe("an export whose asynchronous build fails", () => {
  it("rejects without a download or onAfterExport", async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const onAfterExport = vi.fn();
    const rows = [{ id: "1", name: "Ada" }];
    const handler = makeExportCsvHandler(
      {
        writer: {
          ...BUILT,
          buildAsync: () => Promise.reject(new Error("out of memory")),
        },
        onAfterExport,
      },
      { rows, total: 1, page: 1, limit: 25 } as unknown as TableSource<
        (typeof rows)[number]
      >,
      [{ key: "name" }]
    );
    await expect(handler?.()).rejects.toThrow("out of memory");
    expect(click).not.toHaveBeenCalled();
    expect(onAfterExport).not.toHaveBeenCalled();
  });
});
