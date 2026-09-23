/**
 * Find without cell navigation: a toolbar control and Ctrl/Cmd+F open it, and
 * the matches are marked and scrolled to from find's own state.
 */
import { fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
import { findInTable } from "./find-in-table";
import type { ColumnDef } from "./index";
import { renderMui as renderKit } from "./test-utils";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Zoe" },
  { id: "2", name: "Ada" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);
const findInput = () =>
  document.querySelector<HTMLInputElement>(
    '[data-adapttable-part="find-bar"] input'
  );

function table(button = true) {
  renderKit(
    <DataTable<Row>
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      forceMobile={false}
      features={[findInTable({ button })]}
    />
  );
}

const scrolled = vi.fn();
const originalScroll = Element.prototype.scrollIntoView;
beforeEach(() => {
  scrolled.mockClear();
  Element.prototype.scrollIntoView = scrolled;
});
afterEach(() => {
  Element.prototype.scrollIntoView = originalScroll;
});

describe("find without cell navigation (mui)", () => {
  it("opens from the toolbar control", () => {
    table();
    const button = part("find-button")!;
    expect(button).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(button);

    expect(part("find-bar")).not.toBeNull();
  });

  it("draws no control without button: true", () => {
    table(false);
    expect(part("find-button")).toBeNull();
  });

  it("opens on Ctrl/Cmd+F with focus inside the table", () => {
    table(false);
    const cell = document.querySelector<HTMLElement>("tbody td")!;

    fireEvent.keyDown(cell, { key: "f", ctrlKey: true });

    expect(part("find-bar")).not.toBeNull();
  });

  it("marks the matches and brings the current one into view", async () => {
    table();
    fireEvent.click(part("find-button")!);
    fireEvent.change(findInput()!, { target: { value: "Ada" } });

    await waitFor(() => {
      expect(document.querySelector("[data-cell-match]")).not.toBeNull();
    });
    const current = document.querySelector("[data-cell-match-current]");
    expect(current).toHaveTextContent("Ada");
    await waitFor(() => {
      expect(scrolled).toHaveBeenCalled();
    });
  });
});
