/**
 * Progressive hiding: what a narrow container gives up, and — more
 * importantly — what it never gives up.
 */
import { describe, expect, it } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import { ASSUMED_COLUMN_WIDTH, responsiveColumns } from "./responsiveColumns";

interface Row {
  id: string;
}

const col = (
  key: string,
  width?: number,
  responsivePriority?: number
): ColumnMetadata<Row> => ({ key, width, responsivePriority });

const keys = <T>(result: { columns: readonly ColumnMetadata<T>[] }) =>
  result.columns.map((c) => c.key);

describe("responsiveColumns", () => {
  it("keeps everything when it all fits", () => {
    const columns = [col("a", 100, 2), col("b", 100, 1)];
    const result = responsiveColumns({ columns, available: 500 });

    expect(keys(result)).toEqual(["a", "b"]);
    expect(result.dropped).toEqual([]);
  });

  it("gives up the highest priority number first", () => {
    // priority 1 is the one you keep longest, the ordinary sense of the word.
    const columns = [col("keep", 100, 1), col("lose", 100, 3)];
    const result = responsiveColumns({ columns, available: 150 });

    expect(keys(result)).toEqual(["keep"]);
    expect(result.dropped).toEqual(["lose"]);
  });

  it("gives up as many as it takes, in order", () => {
    const columns = [
      col("id", 100),
      col("a", 100, 1),
      col("b", 100, 2),
      col("c", 100, 3),
    ];
    const result = responsiveColumns({ columns, available: 220 });

    expect(keys(result)).toEqual(["id", "a"]);
    expect(result.dropped).toEqual(["c", "b"]);
  });

  it("never drops a column that declared no priority", () => {
    // Saying nothing is how a column says it carries the row's identity.
    const columns = [col("name", 300), col("email", 300)];
    const result = responsiveColumns({ columns, available: 100 });

    expect(keys(result)).toEqual(["name", "email"]);
    expect(result.dropped).toEqual([]);
  });

  it("stops when nothing is left to give up, rather than squeezing", () => {
    const columns = [col("name", 300), col("note", 300, 1)];
    const result = responsiveColumns({ columns, available: 50 });

    // The table overflows and scrolls — which is honest. Hiding `name` to
    // make the number work would leave rows with no identity.
    expect(keys(result)).toEqual(["name"]);
    expect(result.dropped).toEqual(["note"]);
  });

  it("does nothing at all before the first measure", () => {
    const columns = [col("a", 100, 1), col("b", 100, 2)];
    const result = responsiveColumns({ columns, available: undefined });

    expect(keys(result)).toEqual(["a", "b"]);
  });

  it("costs nothing when no column opted in", () => {
    const columns = [col("a", 100), col("b", 100)];
    const result = responsiveColumns({ columns, available: 10 });

    expect(result.columns).toBe(columns);
  });

  it("counts the checkbox and action columns against the budget", () => {
    const columns = [col("a", 100), col("b", 100, 1)];

    expect(responsiveColumns({ columns, available: 200 }).dropped).toEqual([]);
    expect(
      responsiveColumns({ columns, available: 200, extra: 80 }).dropped
    ).toEqual(["b"]);
  });

  it("budgets a resized column at its new width", () => {
    const columns = [col("a", 100), col("b", 100, 1)];
    const widths = { a: 400 };

    expect(
      responsiveColumns({ columns, available: 300, widths }).dropped
    ).toEqual(["b"]);
  });

  it("assumes a width for a column that declares none", () => {
    const columns = [col("a"), col("b", undefined, 1)];

    // Both budget at the assumed width; room for one.
    expect(
      responsiveColumns({ columns, available: ASSUMED_COLUMN_WIDTH + 10 })
        .dropped
    ).toEqual(["b"]);
    expect(
      responsiveColumns({ columns, available: ASSUMED_COLUMN_WIDTH * 2 })
        .dropped
    ).toEqual([]);
  });

  it("drops the rightmost first when priorities tie", () => {
    const columns = [col("a", 100, 2), col("b", 100, 2), col("c", 100)];
    const result = responsiveColumns({ columns, available: 250 });

    expect(result.dropped).toEqual(["b"]);
  });
});
