/**
 * The composed context menu, bound where an adapter binds it.
 *
 * The pieces are tested separately; what this checks is the assembly — that
 * one set of handlers on a container reaches a header, a row and a cell
 * alike, and that the entries which appear are the ones that target
 * deserves. That is the part an adapter would otherwise have to get right
 * eight times.
 */
import { defaultLabels } from "@adapttable/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { useTableContextMenu } from "./useTableContextMenu";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
];

const onCopy = vi.fn();
const onHide = vi.fn();
const onSort = vi.fn();

function Harness({
  contextMenu = true as boolean | { items?: () => never[] },
}) {
  const menu = useTableContextMenu<Row>({
    contextMenu,
    columns: COLUMNS,
    labels: defaultLabels,
    rowFor: (id) => ROWS.find((r) => r.id === id),
    actions: { onCopy, onHide, onSort },
  });
  return (
    <div>
      <table {...menu.regionProps}>
        <thead>
          <tr>
            <th
              data-adapttable-part="header-cell"
              data-column-key="name"
              tabIndex={0}
            >
              Name
            </th>
          </tr>
        </thead>
        <tbody>
          <tr data-adapttable-part="row" data-row-id="r1">
            <td data-adapttable-part="cell" data-column-key="name">
              <span data-testid="in-cell">Ada</span>
            </td>
          </tr>
        </tbody>
      </table>
      <output data-testid="items">
        {menu.items.map((i) => i.key).join(",")}
      </output>
      <output data-testid="open">{menu.at ? "open" : "closed"}</output>
    </div>
  );
}

const items = () => screen.getByTestId("items").textContent;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTableContextMenu", () => {
  it("offers a header its column's actions", () => {
    render(<Harness />);
    fireEvent.contextMenu(screen.getByText("Name"), { clientX: 5, clientY: 5 });

    expect(items()).toBe("sort-asc,sort-desc,hide");
  });

  it("offers a cell the clipboard actions", () => {
    render(<Harness />);
    fireEvent.contextMenu(screen.getByTestId("in-cell"), {
      clientX: 5,
      clientY: 5,
    });

    expect(items()).toBe("copy");
  });

  it("reaches the keyboard route through the same binding", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByText("Name"), {
      key: "F10",
      shiftKey: true,
    });

    expect(screen.getByTestId("open")).toHaveTextContent("open");
    expect(items()).toBe("sort-asc,sort-desc,hide");
  });

  it("ignores an event with no menu behind it", () => {
    render(<Harness />);
    fireEvent.contextMenu(screen.getByTestId("items"), {
      clientX: 5,
      clientY: 5,
    });

    expect(screen.getByTestId("open")).toHaveTextContent("closed");
  });

  it("binds nothing at all when the prop is absent", () => {
    render(<Harness contextMenu={false} />);
    fireEvent.contextMenu(screen.getByTestId("in-cell"), {
      clientX: 5,
      clientY: 5,
    });

    expect(screen.getByTestId("open")).toHaveTextContent("closed");
    expect(items()).toBe("");
  });

  it("appends the host's own entries", () => {
    const extra = [{ key: "audit", label: "Audit", onSelect: vi.fn() }];
    render(<Harness contextMenu={{ items: () => extra as never[] }} />);
    fireEvent.contextMenu(screen.getByTestId("in-cell"), {
      clientX: 5,
      clientY: 5,
    });

    expect(items()).toBe("copy,audit");
  });

  it("opens on a long press, through the same one binding", () => {
    render(<Harness />);
    const cell = screen.getByTestId("in-cell");
    fireEvent.pointerDown(cell, {
      pointerType: "touch",
      clientX: 8,
      clientY: 9,
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("open")).toHaveTextContent("open");
    expect(items()).toBe("copy");
  });

  it("abandons a press that turns into a scroll", () => {
    render(<Harness />);
    const cell = screen.getByTestId("in-cell");
    fireEvent.pointerDown(cell, {
      pointerType: "touch",
      clientX: 8,
      clientY: 9,
    });
    fireEvent.pointerMove(cell, { clientX: 8, clientY: 60 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByTestId("open")).toHaveTextContent("closed");
  });

  it("abandons a press that lifts, and one the browser cancels", () => {
    render(<Harness />);
    const cell = screen.getByTestId("in-cell");
    for (const end of ["pointerUp", "pointerCancel"] as const) {
      fireEvent.pointerDown(cell, {
        pointerType: "touch",
        clientX: 8,
        clientY: 9,
      });
      fireEvent[end](cell);
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByTestId("open")).toHaveTextContent("closed");
    }
  });
});
