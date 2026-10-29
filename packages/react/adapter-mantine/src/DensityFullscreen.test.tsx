import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { savedViews } from "./saved-views";

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
describe("density and fullscreen (mantine)", () => {
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
      <MantineProvider>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          {...extra}
        />
      </MantineProvider>
    );

  const part = (name: string) =>
    document.querySelector(`[data-adapttable-part="${name}"]`);

  it("shows neither control until asked", () => {
    table();

    expect(part("density-toggle")).toBeNull();
    expect(part("fullscreen-toggle")).toBeNull();
  });

  it("offers the density chooser and reports the choice", () => {
    table({ densityChooser: true, onDensityChange });
    fireEvent.click(part("density-toggle")!);

    expect(onDensityChange).toHaveBeenCalledWith("compact");
  });

  it("applies an uncontrolled choice to the rendered row spacing", () => {
    const { container } = table({ densityChooser: true });
    const rendered = container.querySelector("table")!;

    expect(rendered.style.getPropertyValue("--table-vertical-spacing")).toBe(
      "var(--mantine-spacing-sm)"
    );
    fireEvent.click(part("density-toggle")!);
    expect(
      rendered.style.getPropertyValue("--table-vertical-spacing")
    ).toContain("0.25rem");
  });

  it("goes back the other way from compact", () => {
    table({ densityChooser: true, density: "compact", onDensityChange });
    fireEvent.click(part("density-toggle")!);

    expect(onDensityChange).toHaveBeenCalledWith("comfortable");
  });

  it("offers a fullscreen toggle when the browser allows it", () => {
    table({ fullscreen: true });

    expect(part("fullscreen-toggle")).not.toBeNull();
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

  it("hides the toggle where fullscreen is not allowed at all", () => {
    Object.defineProperty(document, "fullscreenEnabled", {
      value: false,
      configurable: true,
    });
    table({ fullscreen: true });

    expect(part("fullscreen-toggle")).toBeNull();
  });
});
