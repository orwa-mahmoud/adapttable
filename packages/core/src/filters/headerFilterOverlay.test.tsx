import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ExtraFilters } from "../types";
import { defaultFilterRegistry } from "./filterBuiltins";
import type { FilterFormSource } from "./filterForm";
import {
  bindHeaderFilterDismiss,
  headerFilterFieldIsComplete,
  useHeaderFilterOverlay,
  usePointerDismiss,
} from "./headerFilterOverlay";

describe("headerFilterFieldIsComplete", () => {
  it("treats a text operator with no term as incomplete", () => {
    expect(
      headerFilterFieldIsComplete(
        { key: "name", type: "text" },
        { nameOp: "eq" }
      )
    ).toBe(false);
  });

  it("does not treat a typed text term as complete — the operator is still open", () => {
    expect(
      headerFilterFieldIsComplete(
        { key: "name", type: "text" },
        { name: "Ada", nameOp: "contains" }
      )
    ).toBe(false);
  });

  it("treats empty/notEmpty as complete once the operator is stored", () => {
    expect(
      headerFilterFieldIsComplete(
        { key: "name", type: "text" },
        { nameOp: "empty" }
      )
    ).toBe(true);
  });

  it("treats a select/boolean value as complete and a blank as not", () => {
    expect(
      headerFilterFieldIsComplete(
        { key: "status", type: "select" },
        { status: "Active" }
      )
    ).toBe(true);
    expect(
      headerFilterFieldIsComplete({ key: "status", type: "select" }, {})
    ).toBe(false);
    expect(
      headerFilterFieldIsComplete(
        { key: "remote", type: "boolean" },
        { remote: "true" }
      )
    ).toBe(true);
  });

  it("never auto-completes multi-select, checklist, or a number range", () => {
    expect(
      headerFilterFieldIsComplete(
        { key: "tags", type: "multiSelect" },
        { tags: ["a"] }
      )
    ).toBe(false);
    expect(
      headerFilterFieldIsComplete(
        { key: "skills", type: "checklist" },
        { skills: ["a"] }
      )
    ).toBe(false);
    expect(
      headerFilterFieldIsComplete(
        { key: "age", type: "numberRange" },
        { ageOp: "gte", ageMin: "30" }
      )
    ).toBe(false);
  });

  it("never auto-completes an unknown widget kind", () => {
    expect(
      headerFilterFieldIsComplete({ key: "x", type: "custom" }, { x: "1" })
    ).toBe(false);
  });

  it("treats a valueless date-range operator as complete", () => {
    expect(
      headerFilterFieldIsComplete(
        { key: "hired", type: "dateRange" },
        { hiredOp: "empty" }
      )
    ).toBe(true);
    expect(
      headerFilterFieldIsComplete(
        { key: "hired", type: "dateRange" },
        { hiredOp: "gte" }
      )
    ).toBe(false);
  });
});

describe("bindHeaderFilterDismiss", () => {
  const sourceOf = (extra: ExtraFilters): FilterFormSource<{ id: string }> => ({
    extra,
    setExtra: (key, value) => {
      extra[key] = value;
    },
    setExtras: (patch) => {
      Object.assign(extra, patch);
    },
  });

  it("does not dismiss when closeOnSelect is off", () => {
    const dismiss = vi.fn();
    const extra: ExtraFilters = {};
    const bound = bindHeaderFilterDismiss(sourceOf(extra), {
      def: { key: "status", type: "select" },
      dismiss,
    });
    bound.setExtra("status", "Active");
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("dismisses a complete select write when closeOnSelect is on", async () => {
    const dismiss = vi.fn();
    const extra: ExtraFilters = {};
    const bound = bindHeaderFilterDismiss(sourceOf(extra), {
      def: { key: "status", type: "select" },
      closeOnSelect: true,
      dismiss,
    });
    bound.setExtra("status", "Active");
    await Promise.resolve();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss an operator-only range write", async () => {
    const dismiss = vi.fn();
    const extra: ExtraFilters = {};
    const bound = bindHeaderFilterDismiss(sourceOf(extra), {
      def: { key: "age", type: "numberRange" },
      closeOnSelect: true,
      dismiss,
    });
    bound.setExtras({ ageOp: "gte" });
    await Promise.resolve();
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("dismisses a valueless text operator when closeOnSelect is on", async () => {
    const dismiss = vi.fn();
    const extra: ExtraFilters = {};
    const bound = bindHeaderFilterDismiss(sourceOf(extra), {
      def: { key: "name", type: "text" },
      closeOnSelect: true,
      dismiss,
    });
    bound.setExtra("nameOp", "empty");
    await Promise.resolve();
    expect(dismiss).toHaveBeenCalledTimes(1);
  });

  it("does not dismiss a typed text term even when closeOnSelect is on", async () => {
    const dismiss = vi.fn();
    const extra: ExtraFilters = {};
    const bound = bindHeaderFilterDismiss(sourceOf(extra), {
      def: { key: "name", type: "text" },
      closeOnSelect: true,
      dismiss,
    });
    bound.setExtras({ name: "Ada", nameOp: "contains" });
    await Promise.resolve();
    expect(dismiss).not.toHaveBeenCalled();
  });
});

describe("usePointerDismiss", () => {
  const flushArm = async (): Promise<void> => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  it("closes on an outside press and ignores a nested overlay", async () => {
    const dismiss = vi.fn();
    function Probe({ open }: Readonly<{ open: boolean }>) {
      usePointerDismiss(open, dismiss, "[data-session],[data-nested]");
      return (
        <div>
          <div data-session="1">inside</div>
          <div data-nested="1">nested</div>
        </div>
      );
    }
    const { rerender } = render(<Probe open />);
    await flushArm();
    fireEvent.mouseDown(screen.getByText("inside"));
    fireEvent.mouseDown(screen.getByText("nested"));
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent.mouseDown(document.body);
    expect(dismiss).toHaveBeenCalledTimes(1);
    rerender(<Probe open={false} />);
    dismiss.mockClear();
    fireEvent.mouseDown(document.body);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("treats a focused native select as inside", async () => {
    const dismiss = vi.fn();
    function Probe() {
      usePointerDismiss(true, dismiss, "[data-session]");
      return (
        <select data-session="1" aria-label="inside">
          <option>a</option>
        </select>
      );
    }
    render(<Probe />);
    await flushArm();
    act(() => screen.getByRole("combobox", { name: "inside" }).focus());
    fireEvent.mouseDown(document.body);
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const dismiss = vi.fn();
    function Probe() {
      usePointerDismiss(true, dismiss, "[data-session]");
      return <div data-session="1">inside</div>;
    }
    render(<Probe />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});

describe("useHeaderFilterOverlay", () => {
  const extra: ExtraFilters = {};
  const source: FilterFormSource<{ id: string }> = {
    extra,
    setExtra: () => undefined,
    setExtras: () => undefined,
  };

  it("stays closed until setOpen and does not pointer-dismiss when asked not to", () => {
    const { result } = renderHook(() =>
      useHeaderFilterOverlay(
        {
          source,
          def: { key: "name", type: "text" },
        },
        { pointerDismiss: false }
      )
    );
    expect(result.current.open).toBe(false);
    act(() => result.current.setOpen(true));
    expect(result.current.open).toBe(true);
    fireEvent.mouseDown(document.body);
    expect(result.current.open).toBe(true);
    expect(result.current.resetKey).toBe(0);
  });

  it("dismisses a real outside press when pointer-dismiss is on", async () => {
    const { result } = renderHook(() =>
      useHeaderFilterOverlay(
        {
          source,
          def: { key: "name", type: "text" },
        },
        { nestedSelector: "[data-nested]" }
      )
    );
    act(() => result.current.setOpen(true));
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.mouseDown(document.body);
    expect(result.current.open).toBe(false);
    expect(result.current.resetKey).toBeGreaterThan(0);
  });

  it("binds a custom registry and remounts after a finished write", async () => {
    const extra: ExtraFilters = {};
    const source: FilterFormSource<{ id: string }> = {
      extra,
      setExtra: (key, value) => {
        extra[key] = value;
      },
      setExtras: (patch) => {
        Object.assign(extra, patch);
      },
    };
    const { result } = renderHook(() =>
      useHeaderFilterOverlay(
        {
          source,
          def: { key: "status", type: "select" },
          closeOnSelect: true,
          registry: defaultFilterRegistry,
        },
        { pointerDismiss: false }
      )
    );
    act(() => result.current.setOpen(true));
    act(() => result.current.source.setExtra("status", "Active"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.open).toBe(false);
    expect(result.current.resetKey).toBeGreaterThan(0);
  });
});
