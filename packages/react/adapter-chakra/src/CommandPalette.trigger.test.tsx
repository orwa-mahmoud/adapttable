/**
 * Opening the command palette from a control.
 *
 * `button: true` draws the kit's own toolbar button; `open` and
 * `onOpenChange` hand the state to the host.
 */
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderChakra as renderKit } from "./test-utils";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("command palette trigger (chakra)", () => {
  it("draws a toolbar control that opens the palette", () => {
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        commandPalette={{ button: true }}
      />
    );

    const button = part("command-palette-button")!;
    expect(button).toHaveTextContent("Command palette");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(part("command-palette")).toBeNull();

    fireEvent.click(button);

    expect(part("command-palette")).not.toBeNull();
    expect(part("command-palette-button")).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("draws no control without button: true", () => {
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        commandPalette
      />
    );

    expect(part("command-palette-button")).toBeNull();
  });

  it("hands a controlled palette's state to the host", () => {
    const onOpenChange = vi.fn();
    const view = renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        commandPalette={{ button: true, open: false, onOpenChange }}
      />
    );

    fireEvent.click(part("command-palette-button")!);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(part("command-palette")).toBeNull();

    view.unmount();
    renderKit(
      <DataTable
        data={ROWS}
        columns={COLS}
        rowKey={(r) => r.id}
        urlSync={false}
        commandPalette={{ open: true, onOpenChange }}
      />
    );
    expect(part("command-palette")).not.toBeNull();
  });
});
