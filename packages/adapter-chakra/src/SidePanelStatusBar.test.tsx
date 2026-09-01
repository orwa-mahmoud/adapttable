import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "A" },
  { id: "2", name: "B" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "N", accessor: (r) => r.name },
];

/**
 * The docked panel and the status bar, in this kit's own components.
 *
 * Core owns the tab strip's behaviour and the strip's arithmetic; what each
 * adapter has to get right is that both render at all, render with its
 * kit's primitives, and render nothing when the host did not ask.
 */
describe("side panel and status bar (chakra)", () => {
  const onOpenChange = vi.fn();
  const table = (extra?: Record<string, unknown>) =>
    render(
      <ChakraProvider value={defaultSystem}>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          {...extra}
        />
      </ChakraProvider>
    );

  const panel = {
    panels: [
      { key: "one", label: "One", content: <p>panel one</p> },
      { key: "two", label: "Two", content: <p>panel two</p> },
    ],
    open: "one",
    onOpenChange,
  };

  it("renders neither without the props", () => {
    table();

    expect(
      document.querySelector('[data-adapttable-part="status-bar"]')
    ).toBeNull();
    expect(
      document.querySelector('[data-adapttable-part="side-panel"]')
    ).toBeNull();
  });

  it("shows the row count once the status bar is asked for", () => {
    table({ statusBar: true });
    const bar = document.querySelector('[data-adapttable-part="status-bar"]');

    expect(bar?.textContent).toContain("2");
  });

  it("docks the open panel and shows only its content", () => {
    table({ sidePanel: panel });

    expect(
      document.querySelector('[data-adapttable-part="side-panel"]')
    ).not.toBeNull();
    expect(screen.getByText("panel one")).toBeInTheDocument();
    expect(screen.queryByText("panel two")).toBeNull();
  });

  it("switches panels from the tab strip", () => {
    onOpenChange.mockClear();
    table({ sidePanel: panel });
    fireEvent.click(screen.getByRole("tab", { name: "Two" }));

    expect(onOpenChange).toHaveBeenCalledWith("two");
  });

  it("closes from the panel's own control", () => {
    onOpenChange.mockClear();
    table({ sidePanel: panel });
    fireEvent.click(
      document.querySelector('[data-adapttable-part="side-panel-close"]')!
    );

    expect(onOpenChange).toHaveBeenCalledWith(null);
  });

  it("stays closed when the host has no panel open", () => {
    table({ sidePanel: { ...panel, open: null } });

    expect(
      document.querySelector('[data-adapttable-part="side-panel"]')
    ).toBeNull();
  });

  it("docks to the start when asked, and marks the open tab", () => {
    table({ sidePanel: { ...panel, side: "start" } });
    const frame = document.querySelector('[data-adapttable-part="side-panel"]');

    expect(frame?.getAttribute("data-side")).toBe("start");
    expect(
      screen.getByRole("tab", { name: "One" }).getAttribute("aria-selected")
    ).toBe("true");
  });
});
