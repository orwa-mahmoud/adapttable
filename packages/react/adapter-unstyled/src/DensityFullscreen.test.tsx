import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { densityFullscreenTests } from "../../react/test/kit/suites/densityFullscreen";
import { DataTable, kit } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { savedViews } from "./saved-views";

for (const test of densityFullscreenTests(kit)) it(test.name, test.run);

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

/**
 * The density chooser and the fullscreen toggle.
 *
 * Both are opt-in. The fullscreen button additionally hides itself where
 * the browser will not allow fullscreen at all — an embedded webview, a
 * sandboxed frame — which is a real state rather than a hypothetical, and
 * one jsdom reports by default.
 */
describe("density and fullscreen (unstyled)", () => {
  const onDensityChange = vi.fn();

  beforeEach(() => {
    onDensityChange.mockClear();
    Object.defineProperty(document, "fullscreenEnabled", {
      value: true,
      configurable: true,
    });
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      configurable: true,
    });
  });

  const table = (extra?: Record<string, unknown>) =>
    render(
      <>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          {...extra}
        />
      </>
    );

  const part = (name: string) =>
    document.querySelector(`[data-adapttable-part="${name}"]`);

  it("applies an uncontrolled choice to the rendered density hook", () => {
    const { container } = table({ densityChooser: true });
    const root = container.querySelector('[data-adapttable-part="root"]')!;

    expect(root).toHaveAttribute("data-density", "comfortable");
    fireEvent.click(part("density-toggle")!);
    expect(root).toHaveAttribute("data-density", "compact");
  });

  it("opens the table's overlays inside it while fullscreen", async () => {
    // jsdom has no Fullscreen API: promote the element the way a browser does.
    const promoted: Element[] = [];
    Object.defineProperty(document, "fullscreenElement", {
      get: () => promoted.at(-1) ?? null,
      configurable: true,
    });
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      value(this: HTMLElement) {
        promoted.push(this);
        document.dispatchEvent(new Event("fullscreenchange"));
        return Promise.resolve();
      },
      configurable: true,
    });
    try {
      table({
        fullscreen: true,
        features: [savedViews({ storageKey: "fullscreen-views" })],
      });
      fireEvent.click(part("fullscreen-toggle")!);
      expect(document.fullscreenElement).toBe(part("root"));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Saved views" }));
        await Promise.resolve();
      });
      const nameField = await screen.findByPlaceholderText("View name");
      // Outside the promoted element the popover would be hidden with the
      // rest of the page.
      expect(part("root")!.contains(nameField)).toBe(true);
    } finally {
      Reflect.deleteProperty(HTMLElement.prototype, "requestFullscreen");
      Object.defineProperty(document, "fullscreenElement", {
        value: null,
        configurable: true,
      });
    }
  });
});
