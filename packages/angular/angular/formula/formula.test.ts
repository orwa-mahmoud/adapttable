/**
 * Formula columns: a typed column computes from the row, and the list
 * survives a reload through the URL.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { createEnvironmentInjector, EnvironmentInjector } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { buildFormulaColumns } from "./formulaColumns";
import { injectFormulaUrlState } from "./formulaUrlState";

interface Row {
  id: string;
  quantity: number;
  unitPrice: number;
}

const ROW: Row = { id: "a", quantity: 3, unitPrice: 10 };

/** Mount, let a slice write, and flush it by destroying its scope. */
function withSlice<T>(
  make: (injector: ReturnType<typeof createEnvironmentInjector>) => T
) {
  const injector = createEnvironmentInjector(
    [],
    TestBed.inject(EnvironmentInjector)
  );
  return { value: make(injector), destroy: () => injector.destroy() };
}

describe("buildFormulaColumns", () => {
  it("computes a column from the row's fields", () => {
    const { columns, errors, cycles } = buildFormulaColumns<Row>([
      { key: "total", header: "Total", formula: "=quantity * unitPrice" },
    ]);
    const total = columns.find((column) => column.key === "total");
    expect(total?.formatValue?.(ROW)).toBe("30");
    expect(errors).toEqual({});
    expect(cycles).toEqual([]);
  });

  it("reports a formula that will not parse", () => {
    const { errors } = buildFormulaColumns<Row>([
      { key: "broken", formula: "=(" },
    ]);
    expect(errors.broken).toBeTruthy();
  });
});

describe("injectFormulaUrlState", () => {
  it("reads the default while the URL is silent, then keeps a change across a reload", () => {
    const adapter = createMemoryAdapter();
    const initial = [{ key: "total", formula: "=quantity * unitPrice" }];
    const first = withSlice((injector) =>
      injectFormulaUrlState({
        urlAdapter: adapter,
        defaultFormulas: initial,
        injector,
      })
    );
    expect(first.value.formulas()).toEqual(initial);
    const next = [{ key: "double", formula: "=quantity * 2" }];
    first.value.onFormulasChange(next);
    expect(first.value.formulas()).toEqual(next);
    first.destroy();
    expect(adapter.getSearch()).not.toBe("");

    const reload = withSlice((injector) =>
      injectFormulaUrlState({
        urlAdapter: adapter,
        defaultFormulas: initial,
        injector,
      })
    );
    expect(reload.value.formulas()).toEqual(next);
    reload.destroy();
  });

  it("starts empty when the URL is silent and nothing is declared", () => {
    const { value, destroy } = withSlice((injector) =>
      injectFormulaUrlState({
        urlAdapter: createMemoryAdapter(),
        injector,
      })
    );
    expect(value.formulas()).toEqual([]);
    destroy();
  });
});
