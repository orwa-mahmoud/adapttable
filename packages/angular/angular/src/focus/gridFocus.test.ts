/**
 * The keyboard grid reports the selected rectangle to the host.
 */
import {
  type CellNavigationChannelsOptions,
  createMemoryAdapter,
} from "@adapttable/core";
import { Component, PLATFORM_ID, type Signal, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AdaptAttrs } from "../attrs";
import type { ColumnDef } from "../columnDef";
import { injectDataTable } from "../dataTable";
import type { AdaptTableFeature } from "../featureHost";
import { cellNavigation } from "../features/cellNavigation";
import { injectFrontendData } from "../source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { type GridFocusOptions, injectGridFocus } from "./gridFocus";

interface Pair {
  id: string;
  a: string;
  b: string;
}

const ROWS: Pair[] = [
  { id: "1", a: "a1", b: "b1" },
  { id: "2", a: "a2", b: "b2" },
];

const COLUMNS: ColumnDef<Pair>[] = [
  { key: "a", header: "A", editable: true },
  { key: "b", header: "B", editable: true },
];

let editHost: CellNavigationChannelsOptions<Pair>["host"] | undefined;
let recordEdits: GridFocusOptions<Pair>["recordEdits"];
let undo: GridFocusOptions<Pair>["onUndo"];
let redo: GridFocusOptions<Pair>["onRedo"];
let features:
  readonly AdaptTableFeature[] | Signal<readonly AdaptTableFeature[]> = [];
let explicit: ((range: unknown) => void) | undefined;

@Component({
  imports: [AdaptAttrs],
  template: `
    <table [adaptAttrs]="grid.tableAttrs()">
      <tbody>
        @for (row of table.rows(); track row.id; let r = $index) {
          <tr [adaptAttrs]="grid.rowAttrs(row, r)">
            @for (column of table.columns(); track column.key; let c = $index) {
              <td [adaptAttrs]="grid.cellAttrs(column, r, c)">
                {{ column.key }}{{ row.id }}
              </td>
            }
          </tr>
        }
      </tbody>
    </table>
  `,
})
class Host {
  private readonly source = injectFrontendData<Pair>({
    data: signal(ROWS),
    columns: COLUMNS,
    getRowId: (row) => row.id,
  });
  readonly table = injectDataTable<Pair>({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
    features,
  });
  readonly grid = injectGridFocus({
    table: this.table,
    enabled: true,
    onRangeChange: explicit,
    host: editHost,
    recordEdits,
    onUndo: undo,
    onRedo: redo,
  });
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return () => fixture.whenStable();
}

async function selectDown(settle: () => Promise<unknown>) {
  document.querySelector<HTMLElement>("td")!.focus();
  await settle();
  (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "ArrowDown",
      shiftKey: true,
      bubbles: true,
    })
  );
  await settle();
}

beforeEach(() => {
  editHost = undefined;
  recordEdits = undefined;
  undo = undefined;
  redo = undefined;
  features = [];
  explicit = undefined;
  TestBed.configureTestingModule({
    providers: [
      { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
    ],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("injectGridFocus range reporting", () => {
  it("reports through the onRangeChange it is handed", async () => {
    const onRangeChange = vi.fn();
    explicit = onRangeChange;
    const settle = await mount();
    await selectDown(settle);
    expect(onRangeChange).toHaveBeenLastCalledWith({
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 0 },
    });
  });

  it("reports through a composed cellNavigation({ onRangeChange })", async () => {
    const onRangeChange = vi.fn();
    features = [cellNavigation({ onRangeChange })];
    const settle = await mount();
    expect(onRangeChange).toHaveBeenCalledExactlyOnceWith(null);
    await selectDown(settle);
    expect(onRangeChange).toHaveBeenLastCalledWith({
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 0 },
    });
  });
});

describe("injectGridFocus live range callbacks", () => {
  const down = { anchor: { row: 0, col: 0 }, head: { row: 1, col: 0 } };
  const across = { anchor: { row: 0, col: 0 }, head: { row: 1, col: 1 } };

  it("uses a replacement callback on the next range change without replaying it", async () => {
    const first = vi.fn();
    const replacement = vi.fn();
    const composed = signal([cellNavigation({ onRangeChange: first })]);
    features = composed;
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const { grid } = fixture.componentInstance;
    grid.selectRange(down);
    await fixture.whenStable();
    expect(first).toHaveBeenLastCalledWith(down);
    first.mockClear();
    composed.set([cellNavigation({ onRangeChange: replacement })]);
    await fixture.whenStable();
    expect(first).not.toHaveBeenCalled();
    expect(replacement).not.toHaveBeenCalled();
    expect(grid.range()).toEqual(down);
    grid.selectRange(across);
    await fixture.whenStable();
    expect(first).not.toHaveBeenCalled();
    expect(replacement).toHaveBeenCalledExactlyOnceWith(across);
  });

  it("reports the current range when a callback is added and stops when removed", async () => {
    const onRangeChange = vi.fn();
    const composed = signal([cellNavigation()]);
    features = composed;
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const { grid } = fixture.componentInstance;
    grid.selectRange(down);
    await fixture.whenStable();
    composed.set([cellNavigation({ onRangeChange })]);
    await fixture.whenStable();
    expect(onRangeChange).toHaveBeenCalledExactlyOnceWith(down);
    onRangeChange.mockClear();
    composed.set([cellNavigation()]);
    await fixture.whenStable();
    grid.selectRange(across);
    await fixture.whenStable();
    expect(onRangeChange).not.toHaveBeenCalled();
    composed.set([cellNavigation({ onRangeChange })]);
    await fixture.whenStable();
    expect(onRangeChange).toHaveBeenCalledExactlyOnceWith(across);
  });

  it("keeps an explicit callback ahead of live composed callbacks", async () => {
    const direct = vi.fn();
    const composedCallback = vi.fn();
    explicit = direct;
    const composed = signal([cellNavigation()]);
    features = composed;
    const fixture = TestBed.createComponent(Host);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(direct).toHaveBeenCalledExactlyOnceWith(null);
    direct.mockClear();
    composed.set([cellNavigation({ onRangeChange: composedCallback })]);
    await fixture.whenStable();
    expect(direct).not.toHaveBeenCalled();
    fixture.componentInstance.grid.selectRange(down);
    await fixture.whenStable();
    expect(direct).toHaveBeenCalledExactlyOnceWith(down);
    expect(composedCallback).not.toHaveBeenCalled();
  });
});

describe("injectGridFocus column selection", () => {
  it("selects a whole column, and clears it on a second toggle", async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const { grid } = fixture.componentInstance;
    expect(grid.isColumnSelected(1)).toBe(false);
    grid.toggleColumn(1);
    await fixture.whenStable();
    expect(grid.isColumnSelected(1)).toBe(true);
    expect(grid.isColumnSelected(0)).toBe(false);
    expect(grid.range()).toMatchObject({
      anchor: { row: 0, col: 1 },
      head: { row: 1, col: 1 },
    });
    grid.toggleColumn(1);
    await fixture.whenStable();
    expect(grid.isColumnSelected(1)).toBe(false);
  });
});

describe("injectGridFocus on a server platform", () => {
  it("leaves the window's pointer release alone", async () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: "server" });
    const listen = vi.spyOn(globalThis, "addEventListener");
    await mount();
    expect(listen).not.toHaveBeenCalledWith("mouseup", expect.any(Function));
  });
});

describe("injectGridFocus range gestures", () => {
  beforeEach(() => {
    // jsdom has no viewport; focus restoration still exercises the real grid.
    vi.stubGlobal("scrollTo", vi.fn());
  });

  async function editableGrid() {
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return { fixture, grid: fixture.componentInstance.grid };
  }

  function key(value: string) {
    const event = new KeyboardEvent("keydown", {
      key: value,
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.querySelector("table")!.dispatchEvent(event);
    return event;
  }

  it("keeps focus and active state when a child already consumed the key", async () => {
    const { fixture, grid } = await editableGrid();
    grid.focusCell({ row: 0, col: 0 });
    await fixture.whenStable();
    const cells = document.querySelectorAll<HTMLElement>("td");
    const first = cells[0]!;
    const nextRow = cells[2]!;
    expect(document.activeElement).toBe(first);
    first.addEventListener("keydown", (event) => event.preventDefault(), {
      once: true,
    });
    first.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(grid.active()).toEqual({ row: 0, col: 0 });
    expect(grid.range()).toBeNull();
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      })
    );
    await fixture.whenStable();
    expect(grid.active()).toEqual({ row: 1, col: 0 });
    expect(grid.range()).toEqual({
      anchor: { row: 1, col: 0 },
      head: { row: 1, col: 0 },
    });
    expect(document.activeElement).toBe(nextRow);
  });

  it("pastes a rectangle through the batch host and records one gesture", async () => {
    const onCellPaste = vi.fn();
    const onCellEdit = vi.fn();
    const record = vi.fn();
    editHost = { onCellPaste, onCellEdit };
    recordEdits = record;
    vi.stubGlobal("navigator", {
      clipboard: { readText: vi.fn().mockResolvedValue("x\ty\nz\tw") },
    });
    const { fixture, grid } = await editableGrid();
    grid.focusCell({ row: 0, col: 0 });
    expect(key("v").defaultPrevented).toBe(true);
    await fixture.whenStable();
    expect(onCellPaste).toHaveBeenCalledExactlyOnceWith([
      { row: ROWS[0], columnKey: "a", value: "x" },
      { row: ROWS[0], columnKey: "b", value: "y" },
      { row: ROWS[1], columnKey: "a", value: "z" },
      { row: ROWS[1], columnKey: "b", value: "w" },
    ]);
    expect(onCellEdit).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledExactlyOnceWith(
      onCellPaste.mock.calls[0]![0]
    );
    expect(grid.announcement()).toBe("4 cells pasted");
  });

  it("fills down through the original inline host as one history gesture", async () => {
    const onCellEdit = vi.fn();
    const record = vi.fn();
    editHost = { onCellEdit };
    recordEdits = record;
    undo = vi.fn(() => 2);
    redo = vi.fn(() => 2);
    const { grid } = await editableGrid();
    grid.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 1, col: 1 } });
    expect(grid.fillHandleCell()).toEqual({ row: 1, col: 1 });
    key("d");
    expect(onCellEdit.mock.calls).toEqual([
      [ROWS[1], "a", "a1"],
      [ROWS[1], "b", "b1"],
    ]);
    expect(record).toHaveBeenCalledTimes(1);
    expect(record.mock.calls[0]![0]).toHaveLength(2);
    key("z");
    expect(undo).toHaveBeenCalledOnce();
    key("y");
    expect(redo).toHaveBeenCalledOnce();
  });

  it("previews drag fill and commits on a release outside the grid", async () => {
    const onCellFill = vi.fn();
    const record = vi.fn();
    editHost = { onCellFill };
    recordEdits = record;
    const { fixture, grid } = await editableGrid();
    grid.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 0, col: 0 } });
    const start = grid.getFillHandleProps().onMouseDown as (
      event: MouseEvent
    ) => void;
    start(new MouseEvent("mousedown"));
    document
      .querySelectorAll("td")[2]!
      .dispatchEvent(new MouseEvent("mouseenter"));
    expect(grid.fillPreview()).toEqual({
      anchor: { row: 0, col: 0 },
      head: { row: 1, col: 0 },
    });
    window.dispatchEvent(new MouseEvent("mouseup"));
    await fixture.whenStable();
    expect(onCellFill).toHaveBeenCalledExactlyOnceWith([
      { row: ROWS[1], columnKey: "a", value: "a1" },
    ]);
    expect(record).toHaveBeenCalledTimes(1);
    expect(grid.fillPreview()).toBeNull();
  });

  it("leaves paste and fill untouched on a read-only grid", async () => {
    const { grid } = await editableGrid();
    grid.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 1, col: 0 } });
    expect(grid.fillHandleCell()).toBeNull();
    expect(key("v").defaultPrevented).toBe(false);
    expect(key("d").defaultPrevented).toBe(false);
  });

  it("copies the range and reports clipboard failures without an edit", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { fixture, grid } = await editableGrid();
    grid.selectRange({ anchor: { row: 0, col: 0 }, head: { row: 1, col: 1 } });
    key("c");
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledWith("a1\tb1\na2\tb2");
    // The Clipboard API promise chain is outside Angular's pending tasks.
    await vi.waitFor(() => {
      expect(grid.announcement()).toBe("4 cells copied");
    });
    writeText.mockRejectedValueOnce(new Error("denied"));
    key("c");
    await fixture.whenStable();
    expect(writeText).toHaveBeenCalledTimes(2);
    await vi.waitFor(() => {
      expect(grid.announcement()).toBe("Copy failed");
    });
  });
});
