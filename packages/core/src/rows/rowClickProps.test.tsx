import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { rowClickProps } from "./rowClickProps";

const ROW = { id: "a", name: "Alice" };

describe("rowClickProps", () => {
  it("returns undefined without a handler so spreads are unconditional", () => {
    expect(rowClickProps(ROW, undefined)).toBeUndefined();
  });

  it("activates on a plain row click with the pointer affordance", () => {
    const onRowClick = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="row" {...rowClickProps(ROW, onRowClick)}>
            <td>Alice</td>
          </tr>
        </tbody>
      </table>
    );
    const row = screen.getByTestId("row");
    expect(row).toHaveStyle({ cursor: "pointer" });
    fireEvent.click(screen.getByText("Alice"));
    expect(onRowClick).toHaveBeenCalledWith(ROW);
  });

  it("never activates from interactive children — their behaviour wins", () => {
    const onRowClick = vi.fn();
    const onAction = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          <tr {...rowClickProps(ROW, onRowClick)}>
            <td>
              <button type="button" onClick={onAction}>
                Delete
              </button>
              <input aria-label="Select row" type="checkbox" />
              <a href="#x">Open</a>
            </td>
          </tr>
        </tbody>
      </table>
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select row" }));
    fireEvent.click(screen.getByRole("link", { name: "Open" }));
    expect(onAction).toHaveBeenCalled();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("activates on Enter only when the row itself has focus", () => {
    const onRowClick = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="row" {...rowClickProps(ROW, onRowClick)}>
            <td>
              <button type="button">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    );
    const row = screen.getByTestId("row");
    // The props themselves make the row reachable — adapters add nothing.
    expect(row).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(1);
    // Enter on a child button must not double-activate the row.
    fireEvent.keyDown(screen.getByRole("button"), { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(row, { key: "a" });
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("ArrowDown/ArrowUp move focus across sibling rows without wrapping", () => {
    const onRowClick = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="r1" {...rowClickProps({ id: 1 }, onRowClick)}>
            <td>One</td>
          </tr>
          <tr data-testid="r2" {...rowClickProps({ id: 2 }, onRowClick)}>
            <td>Two</td>
          </tr>
          <tr data-testid="r3" {...rowClickProps({ id: 3 }, onRowClick)}>
            <td>Three</td>
          </tr>
        </tbody>
      </table>
    );
    const r1 = screen.getByTestId("r1");
    const r2 = screen.getByTestId("r2");
    r1.focus();
    fireEvent.keyDown(r1, { key: "ArrowDown" });
    expect(r2).toHaveFocus();
    fireEvent.keyDown(r2, { key: "ArrowUp" });
    expect(r1).toHaveFocus();
    // Edge: no wrap-around.
    fireEvent.keyDown(r1, { key: "ArrowUp" });
    expect(r1).toHaveFocus();
    const r3 = screen.getByTestId("r3");
    r3.focus();
    fireEvent.keyDown(r3, { key: "ArrowDown" });
    expect(r3).toHaveFocus();
    // Arrows never activate the row.
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("arrow keys from an interactive child do not steal focus", () => {
    const onRowClick = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <th>Name</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="row" {...rowClickProps({ id: 1 }, onRowClick)}>
            <td>
              <input data-testid="inner" aria-label="x" />
            </td>
          </tr>
          <tr {...rowClickProps({ id: 2 }, onRowClick)}>
            <td>Two</td>
          </tr>
        </tbody>
      </table>
    );
    const inner = screen.getByTestId("inner");
    inner.focus();
    fireEvent.keyDown(inner, { key: "ArrowDown" });
    expect(inner).toHaveFocus();
  });

  it("a detached row (no parent) is a safe no-op for arrow navigation", () => {
    const props = rowClickProps({ id: 1 }, vi.fn())!;
    const detached = document.createElement("tr");
    expect(() =>
      props.onKeyDown({
        key: "ArrowDown",
        target: detached,
        currentTarget: detached,
        preventDefault: () => undefined,
      } as never)
    ).not.toThrow();
  });

  it("activates on Space as well as Enter", () => {
    const onRowClick = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="row" {...rowClickProps({ id: 1 }, onRowClick, 0)}>
            <td>One</td>
          </tr>
        </tbody>
      </table>
    );
    const row = screen.getByTestId("row");
    row.focus();
    fireEvent.keyDown(row, { key: " " });
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("roves the single tab stop with arrow navigation", () => {
    const onRowClick = vi.fn();
    render(
      <table>
        <thead>
          <tr>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr data-testid="r0" {...rowClickProps({ id: 1 }, onRowClick, 0)}>
            <td>One</td>
          </tr>
          <tr data-testid="r1" {...rowClickProps({ id: 2 }, onRowClick, 1)}>
            <td>Two</td>
          </tr>
        </tbody>
      </table>
    );
    const first = screen.getByTestId("r0");
    const second = screen.getByTestId("r1");
    // Only the first row is a Tab stop; the rest are arrow-reachable.
    expect(first.tabIndex).toBe(0);
    expect(second.tabIndex).toBe(-1);
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowDown" });
    expect(second).toHaveFocus();
    // The stop roved along with the focus.
    expect(first.tabIndex).toBe(-1);
    expect(second.tabIndex).toBe(0);
  });
});
