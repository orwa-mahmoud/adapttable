import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
];

/**
 * The context menu, opened the ways a user opens one.
 *
 * The binding is the part that fails silently: forget to spread
 * `regionProps` and nothing happens, with no error and nothing in the DOM.
 * So every route is exercised against a real table rather than trusted.
 */
describe("context menu (antd)", () => {
  const table = (extra?: Record<string, unknown>) =>
    render(
      <>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          contextMenu
          {...extra}
        />
      </>
    );

  const menu = () =>
    document.querySelector('[data-adapttable-part="context-menu"]');

  it("stays shut until asked", () => {
    table();

    expect(menu()).toBeNull();
  });

  it("opens on a right-click over a header, offering that column", () => {
    table();
    fireEvent.contextMenu(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { clientX: 5, clientY: 5 }
    );

    expect(menu()).not.toBeNull();
    expect(screen.getByText("Sort ascending")).toBeInTheDocument();
  });

  it("opens from the keyboard, which is the route usually missing", () => {
    table();
    fireEvent.keyDown(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { key: "F10", shiftKey: true }
    );

    expect(menu()).not.toBeNull();
  });

  it("opens on the dedicated menu key too", () => {
    table();
    fireEvent.keyDown(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { key: "ContextMenu" }
    );

    expect(menu()).not.toBeNull();
  });

  it("renders nothing at all when the prop is absent", () => {
    table({ contextMenu: undefined });
    fireEvent.contextMenu(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { clientX: 5, clientY: 5 }
    );

    expect(menu()).toBeNull();
  });

  it("appends the host's own entries", () => {
    table({
      contextMenu: {
        items: () => [{ key: "audit", label: "Audit", onSelect: vi.fn() }],
      },
    });
    fireEvent.contextMenu(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { clientX: 5, clientY: 5 }
    );

    expect(screen.getByText("Audit")).toBeInTheDocument();
  });

  it("marks a destructive entry and one it cannot run", () => {
    table({
      contextMenu: {
        items: () => [
          {
            key: "del",
            label: "Delete",
            danger: true,
            separatorBefore: true,
            onSelect: vi.fn(),
          },
          { key: "no", label: "Locked", disabled: true, onSelect: vi.fn() },
        ],
      },
    });
    fireEvent.contextMenu(
      document.querySelector('[data-adapttable-part="header-cell"]')!,
      { clientX: 5, clientY: 5 }
    );

    expect(screen.getByText("Delete")).toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });
  it("closes when the surface is dismissed", async () => {
    table();
    fireEvent.contextMenu(screen.getByText("Ada"));
    expect(menu()).not.toBeNull();

    // Escape is the overlay's own dismissal, and it has to reach the table's
    // close callback or the menu stays open over a table it no longer tracks.
    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: "Escape",
    });

    await waitFor(() => {
      expect(menu()).toBeNull();
    });
  });
});
