/**
 * The export controller, driven the way a binding drives it: configure,
 * connect, click, read the snapshot — plus the pure derivations a binding
 * renders from it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetDevWarnings } from "../utils/devWarn";
import {
  createExportController,
  type ExportControllerOptions,
  type ExportRunHandler,
  resolveExportAnnouncement,
  resolveExportDisabledReason,
  resolveExportProgressState,
} from "./exportController";
import type { ExportAllControls, ExportAllResult } from "./tableCsv";

/** Let every pending promise callback run. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A promise the test resolves or rejects by hand. */
function deferred(): {
  promise: Promise<ExportAllResult>;
  resolve: (value: ExportAllResult) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: ExportAllResult) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<ExportAllResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A controller with a notification counter attached. */
function setup(options: ExportControllerOptions) {
  const controller = createExportController(options);
  const listener = vi.fn();
  controller.subscribe(listener);
  return { controller, listener };
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetDevWarnings();
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  resetDevWarnings();
});

describe("createExportController", () => {
  it("starts idle", () => {
    const controller = createExportController({ handler: undefined });
    expect(controller.getSnapshot()).toEqual({
      status: "idle",
      progress: undefined,
      message: "",
      error: "",
      downloadUrl: undefined,
      run: 0,
    });
  });

  it("does nothing without a handler", () => {
    const { controller, listener } = setup({ handler: undefined });
    controller.start();
    expect(controller.getSnapshot().status).toBe("idle");
    expect(listener).not.toHaveBeenCalled();
  });

  it("refuses the export itself while the source is page-only", () => {
    const handler = vi.fn<ExportRunHandler>();
    const { controller, listener } = setup({ handler, pageOnly: true });
    controller.start();
    expect(handler).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it("finishes a synchronous export in one notification", () => {
    const handler = vi.fn<ExportRunHandler>();
    const { controller, listener } = setup({ handler });
    controller.start();
    expect(handler).toHaveBeenCalledWith(undefined);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({
      status: "done",
      run: 1,
      downloadUrl: undefined,
    });
  });

  it("offers the URL a synchronous export returns", () => {
    const { controller } = setup({
      handler: () => ({ url: "/exports/now.csv" }),
    });
    controller.start();
    expect(controller.getSnapshot().downloadUrl).toBe("/exports/now.csv");
  });

  it("counts every run, so two identical outcomes differ", () => {
    const { controller } = setup({ handler: () => undefined });
    controller.start();
    const first = controller.getSnapshot();
    controller.start();
    const second = controller.getSnapshot();
    expect(first.run).toBe(1);
    expect(second.run).toBe(2);
    expect(second).not.toBe(first);
  });

  it("reads the handler configured last, without notifying", () => {
    const first = vi.fn<ExportRunHandler>();
    const second = vi.fn<ExportRunHandler>();
    const { controller, listener } = setup({ handler: first });
    controller.configure({ handler: second });
    expect(listener).not.toHaveBeenCalled();
    controller.start();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribe", () => {
    const controller = createExportController({ handler: () => undefined });
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    unsubscribe();
    controller.start();
    expect(listener).not.toHaveBeenCalled();
  });

  it("marks a browser export failed and rethrows what it threw", () => {
    const { controller, listener } = setup({
      handler: () => {
        throw new Error("disk full");
      },
    });
    expect(() => {
      controller.start();
    }).toThrow("disk full");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot()).toMatchObject({
      status: "failed",
      error: "disk full",
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("exportCsv.request rejected")
    );
  });

  it("marks a server export failed without rethrowing, and names the callback", () => {
    const { controller } = setup({
      handler: () => {
        throw new Error("no quota");
      },
      serverBuilt: true,
    });
    controller.start();
    expect(controller.getSnapshot()).toMatchObject({
      status: "failed",
      error: "no quota",
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("exportCsv.onExportAll rejected")
    );
  });

  it("stays busy until a host promise settles, and refuses a second click", async () => {
    const job = deferred();
    const handler = vi.fn<ExportRunHandler>(() => job.promise);
    const { controller, listener } = setup({ handler });
    controller.start();
    controller.start();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(controller.getSnapshot().status).toBe("busy");

    job.resolve({ url: "/exports/later.csv" });
    await settle();
    expect(listener).toHaveBeenCalledTimes(2);
    expect(controller.getSnapshot()).toMatchObject({
      status: "done",
      downloadUrl: "/exports/later.csv",
    });

    controller.start();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("releases the button when the host promise rejects", async () => {
    const { controller } = setup({
      handler: () => Promise.reject(new Error("backend said no")),
    });
    controller.start();
    await settle();
    expect(controller.getSnapshot()).toMatchObject({
      status: "failed",
      error: "backend said no",
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("exportCsv.request rejected")
    );
  });

  it("reports a rejection that is not an Error as text", async () => {
    const job = deferred();
    const { controller } = setup({ handler: () => job.promise });
    controller.start();
    job.reject("plain reason");
    await settle();
    expect(controller.getSnapshot().error).toBe("plain reason");
  });

  it("clears the last outcome when a fresh run starts", async () => {
    const first = deferred();
    const second = deferred();
    const handler = vi
      .fn<ExportRunHandler>()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { controller } = setup({ handler, serverBuilt: true });
    controller.start();
    first.reject(new Error("once"));
    await settle();
    expect(controller.getSnapshot().error).toBe("once");

    controller.start();
    expect(controller.getSnapshot()).toMatchObject({
      status: "busy",
      error: "",
      message: "",
      progress: undefined,
      downloadUrl: undefined,
      run: 2,
    });
  });

  describe("server-built runs", () => {
    /** Start a server-built run and hand back the controls it received. */
    function startServerRun() {
      let controls: ExportAllControls | undefined;
      const job = deferred();
      const handler = vi.fn<ExportRunHandler>((received) => {
        controls = received;
        return job.promise;
      });
      const harness = setup({ handler, serverBuilt: true });
      harness.controller.start();
      if (!controls) throw new Error("the run received no controls");
      return { ...harness, controls, job, handler };
    }

    it("hands the run an abort signal and progress controls", () => {
      const { controls, controller, listener } = startServerRun();
      expect(controls.signal.aborted).toBe(false);

      controls.setProgress?.(42);
      controls.setMessage?.("Building 21 of 50 pages");
      expect(listener).toHaveBeenCalledTimes(3);
      expect(controller.getSnapshot()).toMatchObject({
        status: "busy",
        progress: 42,
        message: "Building 21 of 50 pages",
      });
    });

    it("folds progress reported during the click into the click's notification", () => {
      const handler = vi.fn<ExportRunHandler>((controls) => {
        controls?.setProgress?.(10);
        controls?.setMessage?.("Queued");
        return new Promise(() => undefined);
      });
      const { controller, listener } = setup({ handler, serverBuilt: true });
      controller.start();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(controller.getSnapshot()).toMatchObject({
        progress: 10,
        message: "Queued",
      });
    });

    it("clamps progress into the public 0–100 range", () => {
      const { controls, controller } = startServerRun();
      controls.setProgress?.(140);
      expect(controller.getSnapshot().progress).toBe(100);
      controls.setProgress?.(-5);
      expect(controller.getSnapshot().progress).toBe(0);
      controls.setProgress?.(Number.NaN);
      expect(controller.getSnapshot().progress).toBe(0);
    });

    it("keeps the snapshot and stays quiet when a report changes nothing", () => {
      const { controls, controller, listener } = startServerRun();
      controls.setMessage?.("Same");
      const before = controller.getSnapshot();
      listener.mockClear();
      controls.setMessage?.("Same");
      expect(controller.getSnapshot()).toBe(before);
      expect(listener).not.toHaveBeenCalled();
    });

    it("clears the host message when the run completes", async () => {
      const { controls, controller, job } = startServerRun();
      controls.setMessage?.("Almost there");
      job.resolve(undefined);
      await settle();
      expect(controller.getSnapshot()).toMatchObject({
        status: "done",
        message: "",
      });
    });

    it("cancels: aborts the signal, clears the surface, ignores the late rejection", async () => {
      const { controls, controller, listener, job } = startServerRun();
      controls.setProgress?.(30);
      controls.setMessage?.("Working");
      listener.mockClear();

      controller.cancel();
      expect(controls.signal.aborted).toBe(true);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(controller.getSnapshot()).toMatchObject({
        status: "cancelled",
        progress: undefined,
        message: "",
        error: "",
      });

      job.reject(new DOMException("Cancelled", "AbortError"));
      await settle();
      expect(controller.getSnapshot().status).toBe("cancelled");
      expect(warn).not.toHaveBeenCalled();
    });

    it("ignores a late success and late reports after a cancel", async () => {
      const { controls, controller, job } = startServerRun();
      controller.cancel();
      controls.setProgress?.(99);
      controls.setMessage?.("Late");
      job.resolve({ url: "/exports/late.csv" });
      await settle();
      expect(controller.getSnapshot()).toMatchObject({
        status: "cancelled",
        progress: undefined,
        message: "",
        downloadUrl: undefined,
      });
    });

    it("cancels once even when the host cancels again from its abort listener", () => {
      const { controls, controller, listener } = startServerRun();
      controls.signal.addEventListener("abort", () => {
        controller.cancel();
      });
      listener.mockClear();
      controller.cancel();
      expect(listener).toHaveBeenCalledTimes(1);
      expect(controller.getSnapshot().status).toBe("cancelled");
    });

    it("retries with a fresh signal", () => {
      const signals: AbortSignal[] = [];
      const handler = vi.fn<ExportRunHandler>((controls) => {
        if (controls) signals.push(controls.signal);
        throw new Error("unavailable");
      });
      const { controller } = setup({ handler, serverBuilt: true });
      controller.start();
      controller.start();
      expect(handler).toHaveBeenCalledTimes(2);
      expect(signals[0]).not.toBe(signals[1]);
    });
  });

  describe("cancel", () => {
    it("does nothing while idle", () => {
      const { controller, listener } = setup({
        handler: () => undefined,
        serverBuilt: true,
      });
      controller.cancel();
      expect(listener).not.toHaveBeenCalled();
      expect(controller.getSnapshot().status).toBe("idle");
    });

    it("does nothing for a browser export, which has no signal", () => {
      const { controller, listener } = setup({
        handler: () => new Promise(() => undefined),
      });
      controller.start();
      listener.mockClear();
      controller.cancel();
      expect(listener).not.toHaveBeenCalled();
      expect(controller.getSnapshot().status).toBe("busy");
    });
  });

  describe("dismiss", () => {
    it("clears a done surface back to idle", () => {
      const { controller } = setup({
        handler: () => ({ url: "/exports/now.csv" }),
      });
      controller.start();
      controller.dismiss();
      expect(controller.getSnapshot()).toMatchObject({
        status: "idle",
        downloadUrl: undefined,
        run: 1,
      });
    });

    it("clears a failed surface and its error", () => {
      const { controller } = setup({
        handler: () => {
          throw new Error("disk full");
        },
        serverBuilt: true,
      });
      controller.start();
      controller.dismiss();
      expect(controller.getSnapshot()).toMatchObject({
        status: "idle",
        error: "",
      });
    });

    it("clears a cancelled surface and leaves the job aborted", () => {
      let signal: AbortSignal | undefined;
      const { controller } = setup({
        handler: (controls) => {
          signal = controls?.signal;
          return new Promise(() => undefined);
        },
        serverBuilt: true,
      });
      controller.start();
      controller.cancel();
      controller.dismiss();
      expect(signal?.aborted).toBe(true);
      expect(controller.getSnapshot().status).toBe("idle");
    });

    it("does nothing while busy or idle", () => {
      const { controller, listener } = setup({
        handler: () => new Promise(() => undefined),
        serverBuilt: true,
      });
      controller.dismiss();
      expect(listener).not.toHaveBeenCalled();
      controller.start();
      listener.mockClear();
      controller.dismiss();
      expect(listener).not.toHaveBeenCalled();
      expect(controller.getSnapshot().status).toBe("busy");
    });
  });

  describe("connect", () => {
    it("abandons a server run on teardown and stays usable after", async () => {
      const job = deferred();
      let signal: AbortSignal | undefined;
      const handler = vi.fn<ExportRunHandler>((controls) => {
        signal = controls?.signal;
        return job.promise;
      });
      const { controller, listener } = setup({ handler, serverBuilt: true });
      const teardown = controller.connect();
      controller.start();
      listener.mockClear();

      teardown();
      expect(signal?.aborted).toBe(true);
      expect(listener).not.toHaveBeenCalled();
      job.resolve({ url: "/exports/orphan.csv" });
      await settle();
      expect(controller.getSnapshot().downloadUrl).toBeUndefined();

      controller.connect();
      controller.start();
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("releases a browser run on teardown and ignores its settlement", async () => {
      const job = deferred();
      const handler = vi.fn<ExportRunHandler>(() => job.promise);
      const { controller } = setup({ handler });
      const teardown = controller.connect();
      controller.start();
      teardown();
      job.reject(new Error("too late"));
      await settle();
      expect(warn).not.toHaveBeenCalled();
      controller.start();
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("tears down cleanly with nothing in flight", () => {
      const { controller, listener } = setup({ handler: () => undefined });
      controller.connect()();
      expect(listener).not.toHaveBeenCalled();
      expect(controller.getSnapshot().status).toBe("idle");
    });
  });
});

describe("resolveExportAnnouncement", () => {
  const input = {
    status: "idle" as const,
    run: 0,
    labels: undefined,
    progress: undefined,
    serverBuilt: false,
  };

  it("says nothing while idle, or while a browser export is busy", () => {
    expect(resolveExportAnnouncement(input)).toBe("");
    expect(resolveExportAnnouncement({ ...input, status: "busy" })).toBe("");
  });

  it("names each outcome in the built-in English", () => {
    expect(resolveExportAnnouncement({ ...input, status: "done" })).toBe(
      "Export complete"
    );
    expect(resolveExportAnnouncement({ ...input, status: "failed" })).toBe(
      "Export failed"
    );
    expect(resolveExportAnnouncement({ ...input, status: "cancelled" })).toBe(
      "Export cancelled"
    );
  });

  it("says a server export started, then how far it is", () => {
    const busy = { ...input, status: "busy" as const, serverBuilt: true };
    expect(resolveExportAnnouncement(busy)).toBe("Preparing export");
    expect(resolveExportAnnouncement({ ...busy, progress: 42 })).toBe(
      "Export 42% complete"
    );
  });

  it("uses the table's own labels", () => {
    const labels = {
      exportDone: "Exportation terminée",
      exportFailed: "Échec de l'exportation",
      exportCancelled: "Exportation annulée",
      exportStarted: "Préparation",
      exportProgress: (progress: number) => `${String(progress)} %`,
    };
    const localized = { ...input, labels };
    expect(resolveExportAnnouncement({ ...localized, status: "done" })).toBe(
      "Exportation terminée"
    );
    expect(resolveExportAnnouncement({ ...localized, status: "failed" })).toBe(
      "Échec de l'exportation"
    );
    expect(
      resolveExportAnnouncement({ ...localized, status: "cancelled" })
    ).toBe("Exportation annulée");
    const busy = { ...localized, status: "busy" as const, serverBuilt: true };
    expect(resolveExportAnnouncement(busy)).toBe("Préparation");
    expect(resolveExportAnnouncement({ ...busy, progress: 7 })).toBe("7 %");
  });

  it("marks every other run with an invisible separator", () => {
    const done = { ...input, status: "done" as const };
    expect(resolveExportAnnouncement({ ...done, run: 2 })).toBe(
      "Export complete"
    );
    expect(resolveExportAnnouncement({ ...done, run: 3 })).toBe(
      "Export complete⁣"
    );
  });
});

describe("resolveExportProgressState", () => {
  const cancel = () => undefined;
  const retry = () => undefined;
  const dismiss = () => undefined;
  const input = {
    serverBuilt: true,
    status: "busy" as const,
    progress: 40,
    message: "Working",
    error: "",
    downloadUrl: undefined,
    cancel,
    retry,
    dismiss,
  };

  it("has no surface for a browser export, or before any run", () => {
    expect(
      resolveExportProgressState({ ...input, serverBuilt: false })
    ).toBeNull();
    expect(resolveExportProgressState({ ...input, status: "idle" })).toBeNull();
  });

  it("offers only Cancel while busy", () => {
    expect(resolveExportProgressState(input)).toEqual({
      status: "busy",
      value: 40,
      message: "Working",
      error: "",
      downloadUrl: undefined,
      onCancel: cancel,
      onRetry: undefined,
      onDismiss: undefined,
    });
  });

  it("offers Retry and Dismiss after a failure", () => {
    const state = resolveExportProgressState({
      ...input,
      status: "failed",
      error: "disk full",
    });
    expect(state).toMatchObject({
      status: "failed",
      error: "disk full",
      onCancel: undefined,
      onRetry: retry,
      onDismiss: dismiss,
    });
  });

  it("offers only Dismiss once done or cancelled", () => {
    for (const status of ["done", "cancelled"] as const) {
      expect(
        resolveExportProgressState({
          ...input,
          status,
          downloadUrl: "/exports/x.csv",
        })
      ).toMatchObject({
        status,
        downloadUrl: "/exports/x.csv",
        onCancel: undefined,
        onRetry: undefined,
        onDismiss: dismiss,
      });
    }
  });
});

describe("resolveExportDisabledReason", () => {
  it("is empty while the button is enabled", () => {
    expect(resolveExportDisabledReason(undefined, false)).toBe("");
  });

  it("says why a page-only source cannot export all", () => {
    expect(resolveExportDisabledReason(undefined, true)).toBe(
      "Export all is off — this source provides one page at a time."
    );
    expect(
      resolveExportDisabledReason(
        { noticeExportAllPage: "Une page à la fois" },
        true
      )
    ).toBe("Une page à la fois");
  });
});
