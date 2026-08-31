import { fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./testDataTable";
import { densityChooser } from "./density";
import { fullscreen } from "./fullscreen";
import type { ColumnDef } from "./index";

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
describe("density and fullscreen (mui)", () => {
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
          features={[
            ...(extra?.densityChooser ? [densityChooser<Row>()] : []),
            ...(extra?.fullscreen ? [fullscreen<Row>()] : []),
          ]}
          {...extra}
        />
      </>
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

  it("goes back the other way from compact", () => {
    table({ densityChooser: true, density: "compact", onDensityChange });
    fireEvent.click(part("density-toggle")!);

    expect(onDensityChange).toHaveBeenCalledWith("comfortable");
  });

  it("offers a fullscreen toggle when the browser allows it", () => {
    table({ fullscreen: true });

    expect(part("fullscreen-toggle")).not.toBeNull();
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
