import {
  defaultLabels,
  EDIT_HISTORY_STATE,
  EXPORT_STATE,
  FeatureStateScope,
  FULLSCREEN_STATE,
  TABLE_PROPS_STATE,
} from "@adapttable/react/adapter";
import { fireEvent, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
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
 * Each control reads the state its feature publishes; without that state it
 * draws nothing.
 */
const base = { labels: defaultLabels };
const part = (name: string) =>
  document.querySelector(`[data-adapttable-part="${name}"]`);

/** The table props a control reads, with the given options. */
function withProps(
  options: Record<string, unknown>,
  children: ReactNode
): ReactElement {
  return (
    <FeatureStateScope
      stateKey={TABLE_PROPS_STATE}
      value={
        {
          density: "comfortable",
          onDensityChange: vi.fn(),
          ...options,
        } as never
      }
    >
      {children}
    </FeatureStateScope>
  );
}

/** Undo and redo as the edit-history stage publishes them. */
function withHistory(
  state: {
    canUndo: boolean;
    canRedo: boolean;
    undo?: () => number;
    redo?: () => number;
  },
  children: ReactNode
): ReactElement {
  return withProps(
    { undoRedoButtons: true },
    <FeatureStateScope
      stateKey={EDIT_HISTORY_STATE}
      value={{
        enabled: true,
        undo: vi.fn(() => 0),
        redo: vi.fn(() => 0),
        clear: vi.fn(),
        record: vi.fn(),
        ...state,
      }}
    >
      {children}
    </FeatureStateScope>
  );
}

describe("UndoRedoButtons (mui)", () => {
  it("draws nothing until a history records", () => {
    renderMui(<UndoRedoButtons {...base} />);
    expect(part("undo-button")).toBeNull();
    expect(part("redo-button")).toBeNull();
  });

  it("disables what the history cannot do yet", () => {
    renderMui(
      withHistory(
        { canUndo: false, canRedo: false },
        <UndoRedoButtons {...base} />
      )
    );
    expect(
      screen.getByRole("button", { name: defaultLabels.undoEdit })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: defaultLabels.redoEdit })
    ).toBeDisabled();
  });

  it("runs each handler once the history allows it", () => {
    const undo = vi.fn(() => 0);
    const redo = vi.fn(() => 0);
    renderMui(
      withHistory(
        { canUndo: true, canRedo: true, undo, redo },
        <UndoRedoButtons {...base} />
      )
    );
    fireEvent.click(
      screen.getByRole("button", { name: defaultLabels.undoEdit })
    );
    fireEvent.click(
      screen.getByRole("button", { name: defaultLabels.redoEdit })
    );
    expect(undo).toHaveBeenCalledTimes(1);
    expect(redo).toHaveBeenCalledTimes(1);
  });
});

describe("ExportCsvButton (mui)", () => {
  it("draws nothing without the export's state", () => {
    const { container } = renderMui(<ExportCsvButton {...base} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("exports on click and speaks the announcement it was given", () => {
    const onExportCsv = vi.fn();
    renderMui(
      <FeatureStateScope
        stateKey={EXPORT_STATE}
        value={
          {
            onExportCsv,
            exportLabel: "Export CSV",
            exportAnnouncement: "2 rows exported",
          } as never
        }
      >
        <ExportCsvButton {...base} />
      </FeatureStateScope>
    );
    const button = screen.getByRole("button", { name: "Export CSV" });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onExportCsv).toHaveBeenCalledTimes(1);
    expect(screen.getByText("2 rows exported")).toBeInTheDocument();
  });

  it("locks the button and says it is busy while one is running", () => {
    renderMui(
      <FeatureStateScope
        stateKey={EXPORT_STATE}
        value={
          {
            onExportCsv: vi.fn(),
            exportBusy: true,
            exportLabel: "Export CSV",
          } as never
        }
      >
        <ExportCsvButton {...base} />
      </FeatureStateScope>
    );
    const button = screen.getByRole("button", { name: /Export CSV/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector("svg")).not.toBeNull();
  });
});

describe("PrintButton (mui)", () => {
  it("draws nothing without a handler", () => {
    renderMui(withProps({ printButton: true }, <PrintButton {...base} />));
    expect(part("print-button")).toBeNull();
  });

  it("prints on click", () => {
    const onPrint = vi.fn();
    renderMui(
      withProps({ printButton: true, onPrint }, <PrintButton {...base} />)
    );
    fireEvent.click(screen.getByRole("button", { name: defaultLabels.print }));
    expect(onPrint).toHaveBeenCalledTimes(1);
  });
});

describe("DensityButton (mui)", () => {
  it("draws from the table's density", () => {
    renderMui(withProps({}, <DensityButton {...base} />));
    expect(part("density-toggle")).not.toBeNull();
  });

  it("names the density it is in and asks for the other one", () => {
    const onDensityChange = vi.fn();
    const { unmount } = renderMui(
      withProps(
        { density: "comfortable", onDensityChange },
        <DensityButton {...base} />
      )
    );
    expect(part("density-toggle")?.textContent).toBe(
      defaultLabels.densityComfortable
    );
    fireEvent.click(part("density-toggle")!);
    expect(onDensityChange).toHaveBeenLastCalledWith("compact");
    unmount();

    renderMui(
      withProps(
        { density: "compact", onDensityChange },
        <DensityButton {...base} />
      )
    );
    expect(part("density-toggle")?.textContent).toBe(
      defaultLabels.densityCompact
    );
    fireEvent.click(part("density-toggle")!);
    expect(onDensityChange).toHaveBeenLastCalledWith("comfortable");
  });
});

describe("FullscreenButton (mui)", () => {
  const fullscreen = (active: boolean, toggle: () => void) => (
    <FeatureStateScope
      stateKey={FULLSCREEN_STATE}
      value={{ supported: true, active, toggle, container: undefined } as never}
    >
      <FullscreenButton {...base} />
    </FeatureStateScope>
  );

  it("draws nothing while the document has no fullscreen", () => {
    renderMui(withProps({ fullscreen: true }, <FullscreenButton {...base} />));
    expect(part("fullscreen-toggle")).toBeNull();
  });

  it("names the way out once it is promoted, and the way in before that", () => {
    const toggle = vi.fn();
    const { unmount } = renderMui(
      withProps({ fullscreen: true }, fullscreen(false, toggle))
    );
    expect(part("fullscreen-toggle")).toHaveAttribute(
      "aria-label",
      defaultLabels.enterFullscreen
    );
    fireEvent.click(part("fullscreen-toggle")!);
    expect(toggle).toHaveBeenCalledTimes(1);
    unmount();

    renderMui(withProps({ fullscreen: true }, fullscreen(true, toggle)));
    expect(part("fullscreen-toggle")).toHaveAttribute(
      "aria-label",
      defaultLabels.exitFullscreen
    );
  });
});
