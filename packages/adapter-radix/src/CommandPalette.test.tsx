import { Theme } from "@radix-ui/themes";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./DataTable";
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
 * The palette, opened the way a user opens it.
 *
 * A palette whose shortcut was never bound simply never appears — nothing
 * on screen is missing, and no error is thrown. Only pressing the chord
 * against a real table says whether it is wired.
 */
describe("command palette (radix)", () => {
  const onPrint = vi.fn();
  const table = (extra?: Record<string, unknown>) =>
    render(
      <Theme>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          commandPalette
          onPrint={onPrint}
          {...extra}
        />
      </Theme>
    );

  const palette = () =>
    document.querySelector('[data-adapttable-part="command-palette"]');
  // Scoped by part: a table renders its own comboboxes, so the role alone
  // is ambiguous.
  const input = () =>
    document.querySelector('[data-adapttable-part="command-input"]')!;

  it("stays shut until the chord is pressed", () => {
    table();

    expect(palette()).toBeNull();
  });

  it("opens on Cmd/Ctrl+K and lists the wired commands", () => {
    table();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(palette()).not.toBeNull();
    expect(screen.getByText("Print")).toBeInTheDocument();
  });

  it("takes focus into its search box", () => {
    table();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(document.activeElement).toBe(input());
  });

  it("runs the highlighted command on Enter", () => {
    onPrint.mockClear();
    table();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.keyDown(input(), { key: "Enter" });

    expect(onPrint).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    table();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.keyDown(input(), { key: "Escape" });

    expect(palette()).toBeNull();
  });

  it("binds nothing when the prop is absent", () => {
    table({ commandPalette: undefined });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(palette()).toBeNull();
  });

  it("moves the highlight and greys out a command it cannot run", () => {
    table({
      commandPalette: {
        commands: [
          { key: "locked", label: "Locked", disabled: true, onSelect: vi.fn() },
        ],
      },
    });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.keyDown(input(), { key: "ArrowDown" });
    const options = document.querySelectorAll(
      '[data-adapttable-part="command-item"]'
    );

    expect(options.length).toBeGreaterThan(1);
    expect(
      [...options].some((el) => el.getAttribute("aria-disabled") === "true")
    ).toBe(true);
    expect(
      [...options].some((el) => el.getAttribute("aria-selected") === "true")
    ).toBe(true);
  });

  it("shows the empty message when nothing matches", () => {
    table();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.change(input(), { target: { value: "zzzz-no-match" } });
    expect(
      document.querySelector('[data-adapttable-part="command-empty"]')
    ).not.toBeNull();
  });
});
