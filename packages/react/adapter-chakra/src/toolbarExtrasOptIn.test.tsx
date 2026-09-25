/**
 * "Omitting a prop renders nothing" — proved for Chakra UI's toolbar extras.
 *
 * It is a stated product rule, and the toolbar is where it is easiest to
 * break: a kit that draws a disabled Undo button for a table with no undo
 * handler has put a dead control in every toolbar that never asked for one.
 */
import { defaultLabels } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import {
  ExportCsvButton,
  FullscreenButton,
  PrintButton,
  UndoRedoButtons,
} from "./components/toolbarExtras";
import { renderChakra } from "./test-utils";

const base = {
  labels: defaultLabels,
  // Required by the slot contract; the density control is not what these
  // assert, so it is wired to a no-op.
  density: "comfortable" as const,
  onDensityChange: () => undefined,
};

/** Some kits wrap their tree in a provider, so "renders nothing" is the
 * absence of the CONTROL, not an empty container. */
function part(root: HTMLElement, name: string): Element | null {
  return root.querySelector(`[data-adapttable-part="${name}"]`);
}

describe("Chakra UI toolbar extras are opt-in", () => {
  it("draws no undo/redo without BOTH handlers", () => {
    const only = renderChakra(
      <UndoRedoButtons {...base} onUndo={vi.fn()} canUndo canRedo />
    );
    // One half is not enough: a Redo that cannot redo is a dead control.
    expect(part(only.container, "undo-button")).toBeNull();
    expect(part(only.container, "redo-button")).toBeNull();
    only.unmount();

    const neither = renderChakra(<UndoRedoButtons {...base} />);
    expect(part(neither.container, "undo-button")).toBeNull();
  });

  it("draws undo/redo once both handlers are given", () => {
    const { container } = renderChakra(
      <UndoRedoButtons
        {...base}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        canUndo
        canRedo
      />
    );

    expect(part(container, "undo-button")).not.toBeNull();
    expect(part(container, "redo-button")).not.toBeNull();
  });

  it("draws no print or fullscreen control without a handler", () => {
    const print = renderChakra(<PrintButton {...base} />);
    expect(part(print.container, "print-button")).toBeNull();
    print.unmount();

    const full = renderChakra(<FullscreenButton {...base} />);
    expect(part(full.container, "fullscreen-toggle")).toBeNull();
  });

  it("draws print and fullscreen once their handlers arrive", () => {
    const print = renderChakra(<PrintButton {...base} onPrint={vi.fn()} />);
    expect(part(print.container, "print-button")).not.toBeNull();
    print.unmount();

    const full = renderChakra(
      <FullscreenButton {...base} onToggleFullscreen={vi.fn()} />
    );
    expect(part(full.container, "fullscreen-toggle")).not.toBeNull();
  });

  it("draws no export button without a handler", () => {
    const { container } = renderChakra(<ExportCsvButton {...base} />);

    expect(part(container, "export-csv-button")).toBeNull();
  });
});
