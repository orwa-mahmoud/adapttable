import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import {
  defaultLabels,
  EDIT_HISTORY_STATE,
  EXPORT_STATE,
  FeatureStateScope,
  FULLSCREEN_STATE,
  TABLE_PROPS_STATE,
} from "@adapttable/react/adapter";
import type { ReactElement, ReactNode } from "react";
import { expect, vi } from "vitest";

import { kitComponent, type ReactKitUnderTest } from "../kit";

/**
 * The shared `toolbarExtrasOptIn.test.tsx` suite: behaviour every React kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function toolbarExtrasOptInTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { render } = kit;
  const ExportCsvButton = kitComponent(kit, "ExportCsvButton");
  const FullscreenButton = kitComponent(kit, "FullscreenButton");
  const PrintButton = kitComponent(kit, "PrintButton");
  const UndoRedoButtons = kitComponent(kit, "UndoRedoButtons");
  return collectConformanceTests(({ describe, it }) => {
    /**
     * "Omitting a prop renders nothing" — proved for each kit's toolbar extras.
     *
     * It is a stated product rule, and the toolbar is where it is easiest to
     * break: a kit that draws a disabled Undo button for a table with no undo
     * handler has put a dead control in every toolbar that never asked for one.
     */

    const base = { labels: defaultLabels };

    /** The table props a feature's control reads, with the given options. */
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
              onDensityChange: () => undefined,
              ...options,
            } as never
          }
        >
          {children}
        </FeatureStateScope>
      );
    }

    /** Undo and redo as the edit-history stage publishes them. */
    function history(enabled: boolean) {
      return {
        enabled,
        canUndo: true,
        canRedo: true,
        undo: vi.fn(() => 0),
        redo: vi.fn(() => 0),
        clear: vi.fn(),
        record: vi.fn(),
      };
    }

    /** Some kits wrap their tree in a provider, so "renders nothing" is the
     * absence of the CONTROL, not an empty container. */
    function part(root: HTMLElement, name: string): Element | null {
      return root.querySelector(`[data-adapttable-part="${name}"]`);
    }

    describe(`${kit.name} toolbar extras are opt-in`, () => {
      it("draws no undo/redo without a recording history or without the buttons asked for", () => {
        const off = render(
          withProps(
            { undoRedoButtons: true },
            <FeatureStateScope
              stateKey={EDIT_HISTORY_STATE}
              value={history(false)}
            >
              <UndoRedoButtons {...base} />
            </FeatureStateScope>
          )
        );
        // A history that records nothing has nothing to undo: no dead control.
        expect(part(off.container, "undo-button")).toBeNull();
        expect(part(off.container, "redo-button")).toBeNull();
        off.unmount();

        const unasked = render(
          withProps(
            {},
            <FeatureStateScope
              stateKey={EDIT_HISTORY_STATE}
              value={history(true)}
            >
              <UndoRedoButtons {...base} />
            </FeatureStateScope>
          )
        );
        expect(part(unasked.container, "undo-button")).toBeNull();
        unasked.unmount();

        const neither = render(<UndoRedoButtons {...base} />);
        expect(part(neither.container, "undo-button")).toBeNull();
      });

      it("draws undo/redo once the history records and the buttons are asked for", () => {
        const { container } = render(
          withProps(
            { undoRedoButtons: true },
            <FeatureStateScope
              stateKey={EDIT_HISTORY_STATE}
              value={history(true)}
            >
              <UndoRedoButtons {...base} />
            </FeatureStateScope>
          )
        );

        expect(part(container, "undo-button")).not.toBeNull();
        expect(part(container, "redo-button")).not.toBeNull();
      });

      it("draws no print or fullscreen control without a handler", () => {
        const print = render(
          withProps({ printButton: true }, <PrintButton {...base} />)
        );
        expect(part(print.container, "print-button")).toBeNull();
        print.unmount();

        const full = render(
          withProps({ fullscreen: true }, <FullscreenButton {...base} />)
        );
        expect(part(full.container, "fullscreen-toggle")).toBeNull();
      });

      it("draws print and fullscreen once their handlers arrive", () => {
        const print = render(
          withProps(
            { printButton: true, onPrint: vi.fn() },
            <PrintButton {...base} />
          )
        );
        expect(part(print.container, "print-button")).not.toBeNull();
        print.unmount();

        const full = render(
          withProps(
            { fullscreen: true },
            <FeatureStateScope
              stateKey={FULLSCREEN_STATE}
              value={
                {
                  supported: true,
                  active: false,
                  toggle: vi.fn(),
                  container: undefined,
                } as never
              }
            >
              <FullscreenButton {...base} />
            </FeatureStateScope>
          )
        );
        expect(part(full.container, "fullscreen-toggle")).not.toBeNull();
      });

      it("draws no export button without the export's state", () => {
        const none = render(<ExportCsvButton {...base} />);
        expect(part(none.container, "export-csv-button")).toBeNull();
        none.unmount();

        const { container } = render(
          <FeatureStateScope
            stateKey={EXPORT_STATE}
            value={{ onExportCsv: vi.fn(), exportBusy: false } as never}
          >
            <ExportCsvButton {...base} />
          </FeatureStateScope>
        );
        expect(part(container, "export-csv-button")).not.toBeNull();
      });
    });
  });
}
