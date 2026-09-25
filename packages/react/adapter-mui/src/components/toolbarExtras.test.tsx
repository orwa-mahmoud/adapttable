import { defaultLabels } from "@adapttable/core";
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderMui } from "../test-utils";
import {
  DensityButton,
  ExportCsvButton,
  FullscreenButton,
  PrintButton,
  UndoRedoButtons,
} from "./toolbarExtras";

/**
 * The optional toolbar controls.
 *
 * Optional controls are drawn when their handler is present. Density is the
 * exception: feature composition decides whether its slot exists, and the
 * rendered slot always receives a resolved density contract.
 */
const base = {
  labels: defaultLabels,
  density: "comfortable" as const,
  onDensityChange: vi.fn(),
};
const part = (name: string) =>
  document.querySelector(`[data-adapttable-part="${name}"]`);

describe("UndoRedoButtons (mui)", () => {
  it("draws nothing until both handlers are supplied", () => {
    renderMui(<UndoRedoButtons {...base} onUndo={vi.fn()} />);
    expect(part("undo-button")).toBeNull();
    expect(part("redo-button")).toBeNull();
  });

  it("disables what the history cannot do yet", () => {
    renderMui(
      <UndoRedoButtons
        {...base}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        undoLabel="Undo"
        redoLabel="Redo"
      />
    );
    expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Redo" })).toBeDisabled();
  });

  it("runs each handler once the history allows it", () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    renderMui(
      <UndoRedoButtons
        {...base}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo
        canRedo
        undoLabel="Undo"
        redoLabel="Redo"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(1);
  });
});

describe("ExportCsvButton (mui)", () => {
  it("draws nothing without a handler", () => {
    const { container } = renderMui(<ExportCsvButton {...base} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("exports on click and speaks the announcement it was given", () => {
    const onExportCsv = vi.fn();
    renderMui(
      <ExportCsvButton
        {...base}
        onExportCsv={onExportCsv}
        exportLabel="Export CSV"
        exportAnnouncement="2 rows exported"
      />
    );
    const button = screen.getByRole("button", { name: "Export CSV" });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onExportCsv).toHaveBeenCalledTimes(1);
    expect(screen.getByText("2 rows exported")).toBeInTheDocument();
  });

  it("locks the button and says it is busy while one is running", () => {
    renderMui(
      <ExportCsvButton
        {...base}
        onExportCsv={vi.fn()}
        exportBusy
        exportLabel="Export CSV"
      />
    );
    const button = screen.getByRole("button", { name: /Export CSV/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg")).not.toBeNull();
  });
});

describe("PrintButton (mui)", () => {
  it("draws nothing without a handler", () => {
    renderMui(<PrintButton {...base} />);
    expect(part("print-button")).toBeNull();
  });

  it("prints on click", () => {
    const onPrint = vi.fn();
    renderMui(<PrintButton {...base} onPrint={onPrint} printLabel="Print" />);
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(onPrint).toHaveBeenCalledTimes(1);
  });
});

describe("DensityButton (mui)", () => {
  it("draws from the resolved density contract", () => {
    renderMui(<DensityButton {...base} />);
    expect(part("density-toggle")).not.toBeNull();
  });

  it("names the density it is in and asks for the other one", () => {
    const onDensityChange = vi.fn();
    const { unmount } = renderMui(
      <DensityButton
        {...base}
        density="comfortable"
        onDensityChange={onDensityChange}
      />
    );
    expect(part("density-toggle")?.textContent).toBe(
      defaultLabels.densityComfortable
    );
    fireEvent.click(part("density-toggle")!);
    expect(onDensityChange).toHaveBeenLastCalledWith("compact");
    unmount();

    renderMui(
      <DensityButton
        {...base}
        density="compact"
        onDensityChange={onDensityChange}
      />
    );
    expect(part("density-toggle")?.textContent).toBe(
      defaultLabels.densityCompact
    );
    fireEvent.click(part("density-toggle")!);
    expect(onDensityChange).toHaveBeenLastCalledWith("comfortable");
  });
});

describe("FullscreenButton (mui)", () => {
  it("draws nothing without a handler", () => {
    renderMui(<FullscreenButton {...base} />);
    expect(part("fullscreen-toggle")).toBeNull();
  });

  it("names the way out once it is promoted, and the way in before that", () => {
    const onToggleFullscreen = vi.fn();
    const { unmount } = renderMui(
      <FullscreenButton {...base} onToggleFullscreen={onToggleFullscreen} />
    );
    expect(part("fullscreen-toggle")).toHaveAttribute(
      "aria-label",
      defaultLabels.enterFullscreen
    );
    fireEvent.click(part("fullscreen-toggle")!);
    expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
    unmount();

    renderMui(
      <FullscreenButton
        {...base}
        onToggleFullscreen={onToggleFullscreen}
        isFullscreen
      />
    );
    expect(part("fullscreen-toggle")).toHaveAttribute(
      "aria-label",
      defaultLabels.exitFullscreen
    );
  });
});
