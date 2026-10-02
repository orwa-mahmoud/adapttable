import { act, render, screen } from "@testing-library/react";
import { Table } from "antd";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { useAntdTableParts } from "./antdParts";
import type { AntdTableRef } from "./antdRowScroll";

/** Ant can replace its native root without replacing the adapter's hook. */
describe("Ant table part ref lifecycle", () => {
  it("rebinds to replacement roots, forwards the ref and disconnects retired roots", async () => {
    const target = createRef<AntdTableRef>();
    function Harness({ version }: Readonly<{ version: number }>) {
      const ref = useAntdTableParts(target);
      return (
        <Table
          key={version}
          ref={ref}
          dataSource={[{ key: "a", name: "Ada" }]}
          columns={[{ key: "name", dataIndex: "name", title: "Name" }]}
          pagination={false}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Total {version}</Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      );
    }
    const view = render(<Harness version={1} />);
    const originalRoot = target.current!.nativeElement;
    const originalFooter = screen.getByText("Total 1").closest("tfoot")!;
    expect(originalFooter).toHaveAttribute("data-adapttable-part", "summary");

    view.rerender(<Harness version={2} />);
    const replacementRoot = target.current!.nativeElement;
    const replacementFooter = screen.getByText("Total 2").closest("tfoot")!;
    expect(replacementRoot).not.toBe(originalRoot);
    expect(replacementFooter).toHaveAttribute(
      "data-adapttable-part",
      "summary"
    );
    const retiredCell = document.createElement("td");
    const liveCell = document.createElement("td");
    await act(async () => {
      originalFooter.rows[0]!.append(retiredCell);
      replacementFooter.rows[0]!.append(liveCell);
      await Promise.resolve();
    });
    expect(retiredCell).not.toHaveAttribute("data-adapttable-part");
    expect(liveCell).toHaveAttribute("data-adapttable-part", "summary-cell");

    view.unmount();
    expect(target.current).toBeNull();
    const unmountedCell = document.createElement("td");
    await act(async () => {
      replacementFooter.rows[0]!.append(unmountedCell);
      await Promise.resolve();
    });
    expect(unmountedCell).not.toHaveAttribute("data-adapttable-part");
  });
  it("honors a host callback ref cleanup and stops observing the retired table", async () => {
    const cleanup = vi.fn();
    const forwarded = vi.fn((_table: AntdTableRef | null) => cleanup);
    function Harness() {
      const ref = useAntdTableParts(forwarded);
      return (
        <Table
          ref={ref}
          dataSource={[{ key: "a", name: "Ada" }]}
          columns={[{ key: "name", dataIndex: "name", title: "Name" }]}
          pagination={false}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>Callback total</Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      );
    }
    const view = render(<Harness />);
    const footer = screen.getByText("Callback total").closest("tfoot")!;
    expect(footer).toHaveAttribute("data-adapttable-part", "summary");
    expect(forwarded).toHaveBeenCalledTimes(1);
    expect(forwarded.mock.calls[0]![0]!.nativeElement).toContainElement(footer);
    view.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(forwarded).toHaveBeenCalledTimes(1);
    const cell = document.createElement("td");
    await act(async () => {
      footer.rows[0]!.append(cell);
      await Promise.resolve();
    });
    expect(cell).not.toHaveAttribute("data-adapttable-part");
  });
});
