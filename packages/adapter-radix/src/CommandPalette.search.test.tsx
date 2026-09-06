/**
 * Searching inside the palette, and what it says when nothing matches.
 *
 * The search box, the highlighted entry and the empty message are three kit
 * components core never draws. A kit that forgets to pass the typed value
 * through still opens a palette — it just never narrows.
 */
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderRadix as renderKit } from "./test-utils";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

function openPalette(): HTMLElement {
  renderKit(
    <DataTable
      data={ROWS}
      columns={COLS}
      rowKey={(r) => r.id}
      urlSync={false}
      commandPalette
      onPrint={vi.fn()}
    />
  );
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
  const input = part("command-input");
  if (!input) throw new Error("the palette never opened");
  return input;
}

const entryLabels = () =>
  [
    ...document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="command-item"]'
    ),
  ].map((item) => item.textContent ?? "");

describe("command palette search (radix)", () => {
  it("narrows the list to what was typed", () => {
    const input = openPalette();
    expect(entryLabels().length).toBeGreaterThan(1);

    fireEvent.change(input, { target: { value: "print" } });

    expect(entryLabels()).toEqual(["Print"]);
  });

  it("says so when nothing matches instead of showing an empty box", () => {
    const input = openPalette();
    fireEvent.change(input, { target: { value: "zzzz" } });

    expect(entryLabels()).toEqual([]);
    expect(part("command-empty")?.textContent ?? "").not.toBe("");
  });

  it("marks the entry Enter would run", () => {
    const input = openPalette();
    fireEvent.change(input, { target: { value: "print" } });

    const active = document.querySelector<HTMLElement>(
      '[data-adapttable-part="command-item"][aria-selected="true"]'
    );
    expect(active?.textContent).toBe("Print");
  });
});
