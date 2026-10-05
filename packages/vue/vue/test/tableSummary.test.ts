import { attachIncrementalView } from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import { createSSRApp, effectScope, h, shallowRef } from "vue";
import { renderToString } from "vue/server-renderer";

import { renderCell, renderFooter } from "../src/columnDef";
import {
  MobileSummaryChrome,
  TableFooterChrome,
  TableSummaryChrome,
} from "../src/layout/tableSummaryChrome";
import {
  useSummaryCells,
  useTableSummaryModel,
} from "../src/layout/tableSummaryModel";
import { useDataTableShell } from "../src/useDataTableShell";

interface Row {
  id: string;
  amount: number;
}
const rows: readonly Row[] = [{ id: "a", amount: 12 }];

describe("shared summary models and Chrome", () => {
  it.each([false, true])(
    "preserves Vue boolean child rendering for %s without changing data cells",
    async (value) => {
      const html = await renderToString(
        createSSRApp({
          render: () =>
            h("div", [
              h("p", { id: "native" }, [value]),
              h("p", { id: "footer" }, [
                renderFooter({ column: { key: "amount" }, value }),
              ]),
            ]),
        })
      );
      const root = document.createElement("div");
      root.innerHTML = html;
      expect(root.querySelector("#footer")?.textContent).toBe(
        root.querySelector("#native")?.textContent
      );
      expect(root.querySelector("#footer")?.textContent).toBe("");
      expect(
        renderCell({
          column: { key: "enabled" },
          row: { enabled: value },
          rowIndex: 0,
          value,
        })
      ).toBe(String(value));
    }
  );

  it("preserves nested conditional footer children, numeric zero and empty strings", async () => {
    const children = [false, [h("b", "Total"), true, [false, 0, ""]]];
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h("div", [
            h("p", { id: "native" }, children),
            h("p", { id: "footer" }, [
              renderFooter({ column: { key: "amount" }, value: children }),
            ]),
          ]),
      })
    );
    const root = document.createElement("div");
    root.innerHTML = html;
    expect(root.querySelector("#footer")?.textContent).toBe(
      root.querySelector("#native")?.textContent
    );
    expect(root.querySelector("#footer")?.textContent).toBe("Total0");
    expect(renderFooter({ column: { key: "amount" }, value: 0 })).toBe("0");
    expect(renderFooter({ column: { key: "amount" }, value: "" })).toBe("");
  });

  it("uses neutral incremental aggregates and bypasses a duplicate host calculation", () => {
    const sourceRows = [...rows];
    const aggregates = { amount: 144 };
    attachIncrementalView(sourceRows, {
      rows: sourceRows,
      filtered: sourceRows,
      sorted: sourceRows,
      aggregates,
      groups: undefined,
    });
    const mapper = vi.fn(() => ({ amount: 12 }));
    const summary = useSummaryCells(
      () => sourceRows,
      () => mapper
    );
    expect(summary.value).toBe(aggregates);
    expect(mapper).not.toHaveBeenCalled();
    expect(
      useSummaryCells(
        () => rows,
        () => undefined
      ).value
    ).toBeUndefined();
  });

  it("reads replaced incremental metadata from a new source snapshot with the same rows", () => {
    const current = [...rows];
    const attach = (amount: number) =>
      attachIncrementalView(current, {
        rows: current,
        filtered: current,
        sorted: current,
        groups: undefined,
        aggregates: { amount },
      });
    attach(12);
    const source = shallowRef({ rows: current });
    const summary = useSummaryCells(
      () => source.value.rows,
      () => undefined
    );
    expect(summary.value?.amount).toBe(12);
    attach(24);
    source.value = { rows: current };
    expect(summary.value?.amount).toBe(24);
  });

  it("does not rerun aggregation for unrelated presentation changes and tracks reactive dependencies", () => {
    const scope = effectScope();
    const factor = shallowRef(1);
    const mapper = vi.fn((current: readonly Row[]) => ({
      amount: current[0]!.amount * factor.value,
    }));
    const options = shallowRef({
      data: rows,
      columns: [{ key: "amount" }],
      rowKey: (row: Row) => row.id,
      urlSync: false,
      summaryRow: mapper,
      tableLabel: "Original",
    });
    const shell = scope.run(() => useDataTableShell<Row>(options));
    if (!shell) throw new Error("Missing shell");
    expect(shell.desktop.value.summary?.cells[0]?.context.value).toBe(12);
    const calls = mapper.mock.calls.length;
    options.value = { ...options.value, tableLabel: "Updated" };
    expect(shell.desktop.value.summary?.cells[0]?.context.value).toBe(12);
    expect(mapper).toHaveBeenCalledTimes(calls);
    factor.value = 2;
    expect(shell.desktop.value.summary?.cells[0]?.context.value).toBe(24);
    scope.stop();
  });

  it("builds the footer only for the current projected leaves without altering cell geometry", async () => {
    const scope = effectScope();
    const result = scope.run(() => {
      const shell = useDataTableShell<Row>({
        data: rows,
        columns: [
          { key: "id", width: 100 },
          { key: "amount", width: 90 },
        ],
        rowKey: (row) => row.id,
        urlSync: false,
      });
      const model = useTableSummaryModel(
        shell.table,
        () => shell.table.columns.value.slice(1),
        () => ({ amount: 12 }),
        () => false
      );
      return { shell, model };
    });
    if (!result?.model.value) throw new Error("Missing summary");
    expect(result.model.value.cells.map((cell) => cell.key)).toEqual([
      "amount",
    ]);
    expect(result.model.value.cells[0]?.attrs).toEqual(
      result.shell.table.cellAttrs(result.shell.table.columns.value[1]!)
    );
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h("table", [
            h(TableSummaryChrome<Row>, {
              model: result.model.value!,
              leading: ["selection", "reorder"],
              trailing: ["actions"],
              startSpacer: () =>
                h("td", {
                  "data-adapttable-part": "column-spacer-start",
                  style: { width: "150px" },
                }),
              endSpacer: () =>
                h("td", {
                  "data-adapttable-part": "column-spacer-end",
                  style: { width: "270px" },
                }),
            }),
          ]),
      })
    );
    expect(html).toContain('data-adapttable-part="column-spacer-start"');
    expect(html).toContain('data-adapttable-part="column-spacer-end"');
    expect(html.match(/data-adapttable-part="summary-cell"/g)).toHaveLength(4);
    scope.stop();
  });

  it("keeps a raw adapter column's key as its accessible label", () => {
    const scope = effectScope();
    const model = scope.run(() => {
      const shell = useDataTableShell<Row>({
        data: rows,
        columns: [{ key: "amount" }],
        rowKey: (row) => row.id,
        urlSync: false,
      });
      return useTableSummaryModel(
        shell.table,
        () => [{ key: "unlabelled", footer: () => "Notes" }],
        () => undefined,
        () => false
      );
    });
    expect(model?.value?.cells[0]?.label).toBe("unlabelled");
    scope.stop();
  });

  it("supports standalone Chrome defaults, missing values, and empty labels", async () => {
    const model = {
      cells: [
        {
          key: "id",
          attrs: {},
          label: "",
          context: { column: { key: "id" }, value: undefined },
        },
        {
          key: "amount",
          attrs: {},
          label: "Amount",
          context: { column: { key: "amount" }, value: 0 },
        },
      ],
    };
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h("div", [
            h("table", [h(TableSummaryChrome<Row>, { model })]),
            h(MobileSummaryChrome<Row>, { model }),
            h(MobileSummaryChrome<Row>, {
              model,
              footer: ({ column }) => column.key,
            }),
            h(TableFooterChrome, { content: () => "Audit" }),
          ]),
      })
    );
    expect(html).toMatch(/data-adapttable-part="table-footer"[^>]*>Audit/);
    expect(html.match(/data-adapttable-part="summary-card"/g)).toHaveLength(2);
    expect(html.match(/data-adapttable-part="card-value"/g)).toHaveLength(3);
    expect(
      renderFooter({ column: { key: "amount" }, value: { unsafe: "object" } })
    ).toBeNull();
  });
});
