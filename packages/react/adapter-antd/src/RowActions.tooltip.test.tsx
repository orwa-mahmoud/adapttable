/**
 * Row action tooltips label a button; they are not controls of their own.
 */
import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "./data-table.test-utils";
import type { ColumnDef } from "./index";
import { renderAntd } from "./test-utils";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];
const COLS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

describe("row action tooltips (antd)", () => {
  it("let the pointer through to the buttons they cover", () => {
    vi.useFakeTimers();
    try {
      renderAntd(
        <DataTable
          data={ROWS}
          columns={COLS}
          rowKey={(r) => r.id}
          urlSync={false}
          rowActions={[
            { key: "edit", label: "Edit", onClick: () => undefined },
          ]}
        />
      );
      const [, second] = screen.getAllByRole("button", { name: "Edit" });
      fireEvent.mouseEnter(second!);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      const tip = document.querySelector<HTMLElement>(".ant-tooltip")!;
      expect(tip).not.toBeNull();
      // The bubble opens over the row above; holding the pointer there would
      // swallow the click meant for that row's own buttons.
      expect(tip.style.pointerEvents).toBe("none");
    } finally {
      vi.useRealTimers();
    }
  });
});
