/**
 * The neutral table is the surface an agent and a non-React host read a live
 * table through, so each accessor has to answer from the ENGINE rather than a
 * snapshot taken when the table was created — a stale answer here is a write
 * aimed at the wrong row.
 */
import { describe, expect, it, vi } from "vitest";

import { createTableEngine } from "./createTableEngine";
import { createNeutralTable } from "./neutralTable";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "r1", name: "Ada" },
  { id: "r2", name: "Grace" },
];

function table() {
  const engine = createTableEngine({
    data: ROWS,
    columns: [{ key: "name", header: "Name" }],
    rowKey: (row: Row) => row.id,
  });
  return { engine, neutral: createNeutralTable(engine, "demo") };
}

describe("createNeutralTable", () => {
  it("resolves a cell through the engine's own value path", () => {
    const { neutral } = table();
    expect(neutral.cellValue(ROWS[0]!, "name")).toBe("Ada");
  });

  it("finds a row by the key the engine assigned it", () => {
    const { neutral } = table();
    expect(neutral.rowByKey("r2")).toEqual(ROWS[1]);
    expect(neutral.rowByKey("gone")).toBeUndefined();
  });

  it("passes a subscription through to the engine and hands back its unsubscribe", () => {
    const { engine, neutral } = table();
    const listener = vi.fn();
    const stop = neutral.subscribe("all", listener);
    engine.configure({ search: "ada" });
    expect(listener).toHaveBeenCalled();
    listener.mockClear();
    stop();
    engine.configure({ search: "grace" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("disposes the engine it wraps", () => {
    const { engine, neutral } = table();
    const dispose = vi.spyOn(engine, "dispose");
    neutral.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
