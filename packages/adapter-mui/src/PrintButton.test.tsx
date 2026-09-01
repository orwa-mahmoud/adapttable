import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "./index";
import { print } from "./print";
import { DataTable } from "./testDataTable";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

/**
 * The Print toolbar button.
 *
 * Opt-in twice over. `onPrint` alone is what it always was — a palette
 * command — and `printButton` alone has nothing to open, so the button
 * appears only when the host has asked for it AND said what to print. It
 * carries the localized `labels.print` caption, because the caption is the
 * accessible name.
 */
describe("print button (mui)", () => {
  const onPrint = vi.fn();

  const table = (extra?: Record<string, unknown>) => {
    onPrint.mockClear();
    return render(
      <>
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          features={
            extra?.printButton && extra?.onPrint
              ? [print<Row>(extra.onPrint as () => void, true)]
              : undefined
          }
          {...extra}
        />
      </>
    );
  };

  const part = () =>
    document.querySelector<HTMLElement>(
      '[data-adapttable-part="print-button"]'
    );

  it("draws nothing until asked", () => {
    table();

    expect(part()).toBeNull();
  });

  it("draws nothing for a handler without the option", () => {
    table({ onPrint });

    expect(part()).toBeNull();
  });

  it("draws nothing for the option without a handler", () => {
    table({ printButton: true });

    expect(part()).toBeNull();
  });

  it("renders the button and prints on click", () => {
    table({ printButton: true, onPrint });
    const button = part();

    expect(button).not.toBeNull();
    expect(button).toHaveTextContent("Print");

    fireEvent.click(button!);
    expect(onPrint).toHaveBeenCalledTimes(1);
  });

  it("takes its caption from the labels", () => {
    table({ printButton: true, onPrint, labels: { print: "Imprimer" } });

    expect(part()).toHaveTextContent("Imprimer");
  });
});
