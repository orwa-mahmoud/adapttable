/**
 * The command list, and what filtering it must not do.
 *
 * The important property is that a command IS a menu entry — there is no
 * second type — so this checks the parts a palette adds: matching that
 * survives accents and case, order that does not shuffle under the user,
 * and the same "unwired means absent" rule the menus follow.
 */
import { describe, expect, it, vi } from "vitest";

import { filterCommands, tableCommands } from "./commandRegistry";

const COMMANDS = [
  { key: "print", label: "Print", onSelect: vi.fn() },
  { key: "export", label: "Export CSV", onSelect: vi.fn() },
  { key: "resume", label: "Résumé sync", onSelect: vi.fn() },
];

const keys = (query: string) =>
  filterCommands(COMMANDS, query).map((c) => c.key);

describe("filterCommands", () => {
  it("lists everything for an empty query", () => {
    expect(keys("")).toEqual(["print", "export", "resume"]);
    expect(keys("   ")).toEqual(["print", "export", "resume"]);
  });

  it("matches anywhere in the label, not just the start", () => {
    expect(keys("csv")).toEqual(["export"]);
  });

  it("ignores case", () => {
    expect(keys("PRINT")).toEqual(["print"]);
  });

  it("finds an accented label typed without accents", () => {
    // Someone typing into a palette is typing fast, from memory, on
    // whatever layout they have. Requiring diacritics hides the command.
    expect(keys("resume")).toEqual(["resume"]);
    expect(keys("Résumé")).toEqual(["resume"]);
  });

  it("keeps registration order rather than sorting", () => {
    // The host chose this order and it must not move as the user types.
    expect(keys("r")).toEqual(["print", "export", "resume"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(keys("zzz")).toEqual([]);
  });
});

describe("tableCommands", () => {
  it("offers only what the host wired", () => {
    expect(tableCommands({ labels: {} })).toEqual([]);
    expect(
      tableCommands({ labels: {}, onPrint: vi.fn() }).map((c) => c.key)
    ).toEqual(["print"]);
  });

  it("keeps the order print, export, clear", () => {
    const built = tableCommands({
      labels: {},
      onPrint: vi.fn(),
      onExport: vi.fn(),
      onClearFilters: vi.fn(),
    });

    expect(built.map((c) => c.key)).toEqual([
      "print",
      "export",
      "clear-filters",
    ]);
  });

  it("disables Clear when there is nothing to clear", () => {
    const off = tableCommands({ labels: {}, onClearFilters: vi.fn() });
    const on = tableCommands({
      labels: {},
      onClearFilters: vi.fn(),
      hasFilters: true,
    });

    expect(off[0]?.disabled).toBe(true);
    expect(on[0]?.disabled).toBe(false);
  });

  it("uses the host's words", () => {
    const built = tableCommands({
      labels: { print: "Drucken" },
      onPrint: vi.fn(),
    });

    expect(built[0]?.label).toBe("Drucken");
  });

  it("names the export after the writer when the button's label is given", () => {
    const csv = tableCommands({ labels: {}, onExport: vi.fn() });
    const xlsx = tableCommands({
      labels: { exportCsv: "Export CSV" },
      onExport: vi.fn(),
      exportLabel: "Export XLSX",
    });

    expect(csv[0]?.label).toBe("Export CSV");
    expect(xlsx[0]?.label).toBe("Export XLSX");
  });

  it("runs the handler it was built from", () => {
    const onPrint = vi.fn();
    tableCommands({ labels: {}, onPrint })[0]?.onSelect();

    expect(onPrint).toHaveBeenCalledTimes(1);
  });
});
