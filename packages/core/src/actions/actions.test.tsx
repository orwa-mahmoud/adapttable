import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BulkAction, RowAction } from "../types";
import { resetDevWarnings } from "../utils/devWarn";
import {
  type ConfirmHandler,
  defaultConfirm,
  resolveDisabledReason,
  runRowAction,
} from "./confirm";
import { useBulkActionRunner } from "./useBulkActionRunner";

interface Row {
  id: string;
}

describe("defaultConfirm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("runs onConfirm when native confirm accepts", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );
    const onConfirm = vi.fn();
    defaultConfirm({
      title: "t",
      message: "m",
      confirmLabel: "ok",
      cancelLabel: "no",
      onConfirm,
    });
    expect(onConfirm).toHaveBeenCalled();
  });

  it("skips onConfirm when native confirm rejects", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false)
    );
    const onConfirm = vi.fn();
    defaultConfirm({
      title: "t",
      message: "m",
      confirmLabel: "ok",
      cancelLabel: "no",
      onConfirm,
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("DENIES the action when no confirm dialog exists (SSR, jsdom, webviews)", () => {
    // The absence of a dialog must never auto-approve a destructive
    // action — deny, and tell the integrator to pass a confirm handler.
    vi.stubGlobal("confirm", undefined);
    resetDevWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const onConfirm = vi.fn();
    defaultConfirm({
      title: "t",
      message: "m",
      confirmLabel: "ok",
      cancelLabel: "no",
      onConfirm,
    });
    expect(onConfirm).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no confirm dialog is available")
    );
    warn.mockRestore();
    resetDevWarnings();
  });

  it("with a dialog present, behavior is unchanged either way", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true)
    );
    const onConfirm = vi.fn();
    const action: RowAction<Row> = {
      key: "del",
      label: "Delete",
      onClick: vi.fn(),
      confirm: { title: "t", message: () => "m", confirmLabel: "ok" },
    };
    runRowAction(action, { id: "x" }, defaultConfirm, "Cancel");
    expect(action.onClick).toHaveBeenCalledWith({ id: "x" });
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("resolveDisabledReason", () => {
  it("keeps a non-empty reason", () => {
    expect(resolveDisabledReason("Locked")).toBe("Locked");
  });

  it("maps an empty string to undefined (not disabled)", () => {
    expect(resolveDisabledReason("")).toBeUndefined();
  });

  it("passes undefined straight through", () => {
    expect(resolveDisabledReason(undefined)).toBeUndefined();
  });
});

describe("runRowAction", () => {
  it("fires immediately without confirm", () => {
    const onClick = vi.fn();
    runRowAction(
      { key: "a", label: "A", onClick },
      { id: "x" },
      vi.fn(),
      "Cancel"
    );
    expect(onClick).toHaveBeenCalledWith({ id: "x" });
  });

  it("routes through confirm and fires on accept", () => {
    const onClick = vi.fn();
    const confirm: ConfirmHandler = (r) => r.onConfirm();
    const action: RowAction<Row> = {
      key: "del",
      label: "Delete",
      onClick,
      confirm: {
        title: "t",
        message: (r) => `Delete ${r.id}`,
        confirmLabel: "Yes",
        danger: true,
      },
    };
    runRowAction(action, { id: "x" }, confirm, "Cancel");
    expect(onClick).toHaveBeenCalledWith({ id: "x" });
  });
});

describe("useBulkActionRunner", () => {
  it("runs a no-confirm action and calls onComplete", async () => {
    const onClick = vi.fn().mockResolvedValue(undefined);
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useBulkActionRunner({
        confirm: vi.fn(),
        cancelLabel: "Cancel",
        onComplete,
      })
    );
    await act(async () => {
      result.current.run({ key: "x", label: "X", onClick }, ["a", "b"]);
      await Promise.resolve();
    });
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: false,
      total: 2,
    });
    expect(onComplete).toHaveBeenCalledWith({ status: "success" });
    expect(result.current.error).toBeNull();
  });

  it("catches a rejecting action: no unhandled rejection, outcome + error surfaced", async () => {
    const boom = new Error("backend said no");
    const onClick = vi.fn().mockRejectedValue(boom);
    const onComplete = vi.fn();
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const { result } = renderHook(() =>
      useBulkActionRunner({
        confirm: vi.fn(),
        cancelLabel: "Cancel",
        onComplete,
      })
    );
    await act(async () => {
      result.current.run({ key: "x", label: "X", onClick }, ["a"]);
      await Promise.resolve();
      await Promise.resolve();
    });
    // Flush the microtask queue fully so a stray rejection would fire.
    await act(async () => new Promise((r) => setTimeout(r, 0)));
    process.off("unhandledRejection", unhandled);

    expect(unhandled).not.toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith({ status: "error", error: boom });
    expect(result.current.error).toBe(boom);
    expect(result.current.pending).toBeNull();

    // The next run clears the stale error.
    const okClick = vi.fn().mockResolvedValue(undefined);
    await act(async () => {
      result.current.run({ key: "y", label: "Y", onClick: okClick }, ["a"]);
      await Promise.resolve();
    });
    expect(result.current.error).toBeNull();
  });

  it("no-ops on an empty id list", () => {
    const onClick = vi.fn();
    const { result } = renderHook(() =>
      useBulkActionRunner({ confirm: vi.fn(), cancelLabel: "Cancel" })
    );
    act(() => result.current.run({ key: "x", label: "X", onClick }, []));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("routes a confirm action through the handler", async () => {
    const onClick = vi.fn().mockResolvedValue(undefined);
    const confirm: ConfirmHandler = (r) => r.onConfirm();
    const action: BulkAction = {
      key: "del",
      label: "Delete",
      onClick,
      confirm: {
        title: "t",
        message: (n) => `Delete ${n}`,
        confirmLabel: "Yes",
      },
    };
    const { result } = renderHook(() =>
      useBulkActionRunner({ confirm, cancelLabel: "Cancel" })
    );
    await act(async () => {
      result.current.run(action, ["a"]);
      await Promise.resolve();
    });
    expect(onClick).toHaveBeenCalledWith(["a"], {
      allMatching: false,
      total: 1,
    });
  });
});

describe("all-matching bulk scope", () => {
  it("threads the scope into onClick and sizes the confirm by total", () => {
    const onClick = vi.fn();
    const confirm = vi.fn(({ onConfirm }: { onConfirm: () => void }) =>
      onConfirm()
    );
    const { result } = renderHook(() =>
      useBulkActionRunner({ confirm, cancelLabel: "Cancel" })
    );
    act(() =>
      result.current.run(
        {
          key: "x",
          label: "X",
          onClick,
          confirm: {
            title: "Sure?",
            message: (count) => `Delete ${count}?`,
            confirmLabel: "Yes",
          },
        },
        ["a", "b"],
        { allMatching: true, total: 57 }
      )
    );
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Delete 57?" })
    );
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: true,
      total: 57,
    });
  });
});
