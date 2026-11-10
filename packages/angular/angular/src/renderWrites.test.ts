/**
 * A render reads the table's stores and writes none of them: every write
 * comes from an event or an effect. Each table store is wrapped so a write
 * records the stack it was made on; one made while Angular runs a template
 * or recomputes a computed carries Angular's frame for it.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import type * as TableStoreModule from "../../../shared/core/src/state/tableStore";
import { AdaptAttrs } from "./attrs";
import type { ColumnDef } from "./columnDef";
import { injectDataTable } from "./dataTable";
import { injectRowSelection } from "./selection/selection";
import { injectFrontendData } from "./source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "./url/tableUrlState";

const writes: string[] = [];

vi.mock("../../../shared/core/src/state/tableStore", async (load) => {
  const actual = await load<typeof TableStoreModule>();
  return {
    ...actual,
    createTableStore: () => {
      const store = actual.createTableStore();
      const record = () => writes.push(new Error("store write").stack ?? "");
      return {
        ...store,
        dispatch: (action: Parameters<typeof store.dispatch>[0]) => {
          record();
          store.dispatch(action);
        },
        batch: (run: Parameters<typeof store.batch>[0]) => {
          record();
          store.batch(run);
        },
      };
    },
  };
});

interface Person {
  id: string;
  name: string;
}
const PEOPLE: Person[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
];
const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", sortable: true, accessor: (row) => row.name },
];

@Component({
  imports: [AdaptAttrs],
  template: `
    <table>
      <tbody>
        @for (row of table.rows(); track row.id; let i = $index) {
          <tr [adaptAttrs]="table.rowAttrs(row, i)">
            <td>
              <input [adaptAttrs]="selection.rowCheckboxAttrs(row.id)" />
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
class Table {
  readonly controlled = signal<readonly string[]>([]);
  readonly source = injectFrontendData({
    data: signal(PEOPLE),
    columns: COLUMNS,
    paginationMode: "paged",
  });
  readonly selection = injectRowSelection({
    rows: computed(() => this.source().rows),
    rowKey: (row: Person) => row.id,
    selectedIds: this.controlled,
    onSelectionChange: () => undefined,
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
    selection: this.selection,
  });
}

/** Writes made while Angular ran a template or recomputed a computed. */
const inRender = () =>
  writes.filter(
    (stack) =>
      stack.includes("executeTemplate") ||
      stack.includes("producerRecomputeValue")
  );

describe("an Angular table render", () => {
  it("writes none of the table's stores", async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
    const fixture = TestBed.createComponent(Table);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const table = fixture.componentInstance;

    table.controlled.set(["1"]);
    await fixture.whenStable();
    table.table.toggleSort("name");
    await fixture.whenStable();
    table.source().setSearch("gr");
    await fixture.whenStable();

    expect(writes.length).toBeGreaterThan(0);
    expect(inRender()).toEqual([]);
  });
});
