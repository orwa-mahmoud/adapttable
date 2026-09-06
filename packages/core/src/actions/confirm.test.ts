/**
 * Confirmation is the last thing standing between a click and a deletion, so
 * the interesting case is the environment that cannot ask: SSR, jsdom, an
 * embedded webview with no dialog. An environment that cannot ask must deny —
 * approving on the user's behalf is the one outcome that cannot be undone.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RowAction } from "../types";
import { resetDevWarnings } from "../utils/devWarn";
import {
  type ConfirmHandler,
  defaultConfirm,
  resolveDisabledReason,
  runRowAction,
} from "./confirm";

interface Row {
  id: string;
  name: string;
}

const ROW: Row = { id: "r1", name: "Ada" };

describe("defaultConfirm", () => {
  beforeEach(() => {
    resetDevWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("runs the action when the user agrees", () => {
    const onConfirm = vi.fn();
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    defaultConfirm({ message: "Delete Ada?", onConfirm } as never);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the user declines", () => {
    const onConfirm = vi.fn();
    vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    defaultConfirm({ message: "Delete Ada?", onConfirm } as never);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("denies, and says why, where no dialog exists", () => {
    const onConfirm = vi.fn();
    const warn = vi.spyOn(console, "warn");
    const original = globalThis.confirm;
    // @ts-expect-error — modelling an environment that ships no dialog.
    delete globalThis.confirm;
    try {
      defaultConfirm({ message: "Delete Ada?", onConfirm } as never);
    } finally {
      globalThis.confirm = original;
    }
    expect(onConfirm).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("was NOT run"));
  });
});

describe("resolveDisabledReason", () => {
  it("treats only a non-empty reason as a reason", () => {
    expect(resolveDisabledReason("Locked")).toBe("Locked");
    expect(resolveDisabledReason("")).toBeUndefined();
    expect(resolveDisabledReason(undefined)).toBeUndefined();
  });
});

describe("runRowAction", () => {
  it("runs an unguarded action straight away", () => {
    const onClick = vi.fn();
    const confirm = vi.fn();
    runRowAction(
      { key: "edit", label: "Edit", onClick },
      ROW,
      confirm,
      "Cancel"
    );
    expect(onClick).toHaveBeenCalledWith(ROW);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks first when the action declares a confirmation, and runs on yes", () => {
    const onClick = vi.fn();
    const confirm: ConfirmHandler = vi.fn(({ onConfirm }) => {
      onConfirm();
    });
    const action: RowAction<Row> = {
      key: "delete",
      label: "Delete",
      onClick,
      confirm: {
        title: "Delete row",
        message: (row) => `Delete ${row.name}?`,
        confirmLabel: "Delete",
        danger: true,
      },
    };
    runRowAction(action, ROW, confirm, "Keep");
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Delete row",
        message: "Delete Ada?",
        confirmLabel: "Delete",
        cancelLabel: "Keep",
        danger: true,
      })
    );
    expect(onClick).toHaveBeenCalledWith(ROW);
  });

  it("leaves the row alone when the dialog never confirms", () => {
    const onClick = vi.fn();
    runRowAction(
      {
        key: "delete",
        label: "Delete",
        onClick,
        confirm: {
          title: "Delete row",
          message: () => "Sure?",
          confirmLabel: "Delete",
        },
      },
      ROW,
      () => undefined,
      "Cancel"
    );
    expect(onClick).not.toHaveBeenCalled();
  });
});
