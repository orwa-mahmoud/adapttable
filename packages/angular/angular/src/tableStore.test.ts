/**
 * One store per table: the parts a table creates keep their state in the
 * store it provides, so one change publishes once, when it ends.
 */
import { createTableStore } from "@adapttable/core/binding";
import { Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { injectRowExpansion } from "./rows/rowExpansion";
import { injectRowSelection } from "./selection/selection";
import { TABLE_STORE } from "./tableStore";
import { injectTableUrlState } from "./url/tableUrlState";

describe("one store per table in Angular", () => {
  it("keeps expansion, selection and the view state in the table's store", () => {
    const store = createTableStore();
    const injector = Injector.create({
      providers: [{ provide: TABLE_STORE, useValue: store }],
      parent: TestBed.inject(Injector),
    });
    const expansion = injectRowExpansion({ injector });
    const url = injectTableUrlState({ injector, urlSync: false });

    // Inside the table's batch nothing is published; both changes land when
    // it ends, which only happens when they share the store.
    store.batch(() => {
      expansion().toggle("a");
      url.setSort("name", "asc");
      expect(expansion().isExpanded("a")).toBe(false);
    });
    expect(expansion().isExpanded("a")).toBe(true);
    expect(url.state().sortBy).toBe("name");
  });

  it("gives a part outside a table a store of its own", () => {
    const selection = TestBed.runInInjectionContext(() =>
      injectRowSelection<{ id: string }>({
        rows: signal([{ id: "a" }]),
        rowKey: (row) => row.id,
        labels: { selectAll: "Select all", selectRow: "Select row" },
      })
    );
    expect(selection).toBeDefined();
  });
});
