/** Retired Angular runners cannot start writes; in-flight writes still finish. */
import {
  type BulkAction,
  type ConfirmRequest,
  resolveLabels,
} from "@adapttable/core";
import type {
  BulkBarSlotProps,
  SelectionState,
} from "@adapttable/core/binding";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import {
  injectBulkActionRunner,
  injectBulkBarRunner,
} from "./bulkActionRunner";

function pendingWrite() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((accept, refuse) => {
    resolve = accept;
    reject = refuse;
  });
  return { promise, resolve, reject };
}

@Component({ template: "" })
class Host {
  readonly confirm = vi.fn<(request: ConfirmRequest) => void>();
  readonly completed = vi.fn();
  readonly runner = injectBulkActionRunner({
    confirm: this.confirm,
    cancelLabel: "Cancel",
    onComplete: this.completed,
  });
}

const confirmed = (onClick: BulkAction["onClick"]): BulkAction => ({
  key: "delete",
  label: "Delete",
  onClick,
  confirm: {
    title: "Delete rows",
    message: (count) => `Delete ${count} rows?`,
    confirmLabel: "Delete",
    danger: true,
  },
});

@Component({ template: "" })
class BarHost {
  readonly clear = vi.fn();
  readonly confirm = vi.fn<(request: ConfirmRequest) => void>();
  readonly props = signal<BulkBarSlotProps<SelectionState>>({
    selection: {
      selectedIds: new Set(["one"]),
      selectedCount: 1,
      headerState: "all",
      visibleIds: ["one"],
      allMatching: false,
      acrossPages: true,
      isSelected: () => true,
      toggle: vi.fn(),
      toggleAll: vi.fn(),
      toggleGroupLeaves: vi.fn(),
      replace: vi.fn(),
      selectAllMatching: vi.fn(),
      clear: this.clear,
    },
    total: 1,
    bulkActions: [],
    labels: resolveLabels(undefined),
    confirm: this.confirm,
  });
  readonly runner = injectBulkBarRunner(this.props);
}

describe("bulk action lifetime", () => {
  it("rejects a delayed confirmation after its owner is destroyed", () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    const write = vi.fn();
    host.runner.run(confirmed(write), ["one"]);
    expect(host.confirm).toHaveBeenCalledOnce();
    const request = host.confirm.mock.calls[0]![0];
    fixture.destroy();
    request.onConfirm();
    expect(write).not.toHaveBeenCalled();
    expect(host.completed).not.toHaveBeenCalled();
  });

  it("ignores retained run callbacks after destruction, including unconfirmed actions", () => {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.componentInstance;
    const write = vi.fn();
    fixture.destroy();
    host.runner.run(confirmed(write), ["one"]);
    host.runner.run({ key: "archive", label: "Archive", onClick: write }, [
      "one",
    ]);
    expect(host.confirm).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    expect(host.completed).not.toHaveBeenCalled();
  });

  it.each(["success", "error"] as const)(
    "preserves the %s outcome of a write already started before destruction",
    async (status) => {
      const fixture = TestBed.createComponent(Host);
      const host = fixture.componentInstance;
      const pending = pendingWrite();
      const write = vi.fn(() => pending.promise);
      host.runner.run(confirmed(write), ["one"], {
        allMatching: true,
        total: 50,
      });
      const request = host.confirm.mock.calls[0]![0];
      expect(request.message).toBe("Delete 50 rows?");
      request.onConfirm();
      expect(write).toHaveBeenCalledExactlyOnceWith(["one"], {
        allMatching: true,
        total: 50,
      });
      fixture.destroy();
      const error = new Error("Host write failed");
      if (status === "success") pending.resolve();
      else pending.reject(error);
      await Promise.resolve();
      expect(host.completed).toHaveBeenCalledExactlyOnceWith(
        status === "success" ? { status } : { status, error }
      );
      request.onConfirm();
      expect(write).toHaveBeenCalledTimes(1);
    }
  );

  it("reads a replacement completion callback when each run begins", async () => {
    let completed = vi.fn();
    const first = completed;
    const runner = TestBed.runInInjectionContext(() =>
      injectBulkActionRunner({
        confirm: vi.fn(),
        cancelLabel: "Cancel",
        get onComplete() {
          return completed;
        },
      })
    );
    completed = vi.fn();
    runner.run({ key: "archive", label: "Archive", onClick: vi.fn() }, ["one"]);
    await Promise.resolve();
    expect(first).not.toHaveBeenCalled();
    expect(completed).toHaveBeenCalledExactlyOnceWith({ status: "success" });
  });

  it("does not clear current selection after a retired bulk bar's write finishes", async () => {
    const fixture = TestBed.createComponent(BarHost);
    const host = fixture.componentInstance;
    const pending = pendingWrite();
    host.runner.run(
      { key: "archive", label: "Archive", onClick: () => pending.promise },
      ["one"]
    );
    fixture.destroy();
    pending.resolve();
    await Promise.resolve();
    expect(host.clear).not.toHaveBeenCalled();
  });

  it("keeps a live bar's current confirmation, labels and success cleanup", async () => {
    const fixture = TestBed.createComponent(BarHost);
    const host = fixture.componentInstance;
    const confirm = vi.fn<(request: ConfirmRequest) => void>();
    const clear = vi.fn();
    host.props.update((current) => ({
      ...current,
      labels: { ...current.labels, cancel: "Keep rows" },
      confirm,
      selection: { ...current.selection, clear },
    }));
    const write = vi.fn();
    host.runner.run(confirmed(write), ["one"]);
    expect(host.confirm).not.toHaveBeenCalled();
    const request = confirm.mock.calls[0]![0];
    expect(request.cancelLabel).toBe("Keep rows");
    request.onConfirm();
    await Promise.resolve();
    expect(write).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
    expect(host.clear).not.toHaveBeenCalled();
  });
});
