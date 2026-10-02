/**
 * Prove the reorder Chrome calls through to host callbacks, presses the
 * grip, locks while pending, and announces exactly what the controller says.
 */
import { createMemoryAdapter } from "@adapttable/core";
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { injectDataTable } from "../dataTable";
import { rowReorder } from "../features/rowReorder";
import { injectFrontendData } from "../source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { injectRowReorder, type RowReorderState } from "./rowReorder";
import {
  AdaptRowReorderAnnouncer,
  AdaptRowReorderButtonsChrome,
  AdaptRowReorderHandleChrome,
  type RowMoveMenuSlotProps,
  type RowReorderHandleSlotProps,
  type RowReorderMoveButtonProps,
} from "./rowReorderHandle";

interface Person {
  id: string;
  name: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
  { id: "3", name: "Linus" },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", accessor: (row) => row.name },
];

const LABELS = {
  reorderRow: "Reorder row",
  moveRowUp: "Move row up",
  moveRowDown: "Move row down",
  rowLifted: (position: number) => `Row ${String(position)} lifted`,
  rowMoved: (from: number, to: number) =>
    `Row moved from ${String(from)} to ${String(to)}`,
  rowReorderCancelled: "Reorder cancelled",
};

@Component({
  selector: "test-reorder-handle",
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      type="button"
      data-adapttable-part="row-reorder-handle"
      [attr.aria-label]="p.label"
      [attr.aria-pressed]="p.pressed ? 'true' : 'false'"
      [disabled]="p.disabled"
      [attr.draggable]="p.dragProps.draggable ? 'true' : null"
      (dragstart)="p.dragProps.onDragStart($event)"
      (dragend)="p.dragProps.onDragEnd()"
      (keydown)="p.onKeyDown($event)"
    >
      grip
    </button>
  `,
})
class TestHandle {
  readonly props = input.required<RowReorderHandleSlotProps>();
}

@Component({
  selector: "test-reorder-menu",
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <div data-adapttable-part="row-move-menu">
      @for (item of p.items; track item.id) {
        <button
          type="button"
          role="menuitem"
          [disabled]="item.disabled"
          (click)="item.onSelect()"
        >
          {{ item.label }}
        </button>
      }
    </div>
  `,
})
class TestMenu {
  readonly props = input.required<RowMoveMenuSlotProps>();
}

@Component({
  selector: "test-reorder-move",
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      type="button"
      [attr.data-adapttable-part]="p.part"
      [attr.aria-label]="p.label"
      [disabled]="p.disabled"
      (click)="p.onClick()"
    >
      {{ p.part }}
    </button>
  `,
})
class TestMoveButton {
  readonly props = input.required<RowReorderMoveButtonProps>();
}

@Component({
  imports: [
    AdaptRowReorderHandleChrome,
    AdaptRowReorderButtonsChrome,
    AdaptRowReorderAnnouncer,
  ],
  template: `
    @if (reorder(); as state) {
      <adapt-row-reorder-handle-chrome
        [reorder]="state"
        [labels]="labels"
        [rowId]="'1'"
        [localIndex]="0"
        [row]="people[0]"
        [windowStart]="0"
        [rowCount]="3"
        [slots]="handleSlots"
      />
      <adapt-row-reorder-buttons-chrome
        [reorder]="state"
        [labels]="labels"
        [localIndex]="0"
        [row]="people[0]"
        [windowStart]="0"
        [rowCount]="3"
        [slots]="buttonSlots"
      />
      <adapt-row-reorder-announcer
        [props]="{ announcement: state.announcement }"
      />
    }
  `,
})
class ChromeHost {
  readonly people = PEOPLE;
  readonly labels = LABELS;
  readonly data = signal(PEOPLE);
  readonly onRowReorder = vi.fn();
  readonly features = [rowReorder(this.onRowReorder)];
  readonly source = injectFrontendData({
    data: this.data,
    columns: COLUMNS,
    paginationMode: "paged",
    defaults: { limit: 10 },
  });
  readonly table = injectDataTable({
    source: this.source,
    columns: COLUMNS,
    rowKey: (row) => row.id,
  });
  readonly reorder = injectRowReorder({
    table: this.table,
    source: this.source,
    features: this.features,
  })!;
  readonly handleSlots = { Handle: TestHandle, Menu: TestMenu };
  readonly buttonSlots = { Button: TestMoveButton, Menu: TestMenu };
}

function dragEvent(
  type: string,
  transfer: {
    setData?: ReturnType<typeof vi.fn>;
    getData?: (mime: string) => string;
    effectAllowed?: string;
    dropEffect?: string;
    types?: string[];
  }
): DragEvent {
  return Object.assign(new Event(type), {
    dataTransfer: transfer,
    clientY: 0,
    preventDefault: vi.fn(),
  }) as unknown as DragEvent;
}

@Component({
  imports: [AdaptRowReorderHandleChrome],
  template: `
    <adapt-row-reorder-handle-chrome
      [reorder]="reorder"
      [labels]="labels"
      [rowId]="'1'"
      [localIndex]="0"
      [row]="people[0]"
      [windowStart]="0"
      [rowCount]="3"
      [slots]="handleSlots"
    />
  `,
})
class PendingHost {
  readonly people = PEOPLE;
  readonly labels = LABELS;
  readonly reorder = {
    lifted: null,
    overIndex: null,
    overPosition: null,
    pendingMove: null,
    hostConfirmPending: true,
    announcement: "",
    isLifted: () => false,
    dragProps: () => ({
      draggable: true as const,
      onDragStart: () => undefined,
      onDragEnd: () => undefined,
    }),
    dropProps: () => ({
      onDragOver: () => undefined,
      onDrop: () => undefined,
    }),
    handleKeyDown: () => undefined,
    moveBy: () => undefined,
    moveMenu: () => ({
      kind: "group" as const,
      label: "Move to group…",
      targets: [{ id: "docs", label: "Docs" }],
    }),
    selectMoveTarget: () => undefined,
    confirmMove: () => undefined,
    cancelMove: () => undefined,
    rowAttrs: () => ({}),
  } as unknown as RowReorderState<Person>;
  readonly handleSlots = { Handle: TestHandle, Menu: TestMenu };
}

describe("AdaptRowReorderHandleChrome", () => {
  it("lifts on Space, sets aria-pressed, announces, and commits on the second Space", async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
    const fixture = TestBed.createComponent(ChromeHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const grip = root.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="row-reorder-handle"]'
    );
    expect(grip).not.toBeNull();
    expect(grip!.getAttribute("aria-pressed")).toBe("false");

    grip!.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );
    fixture.detectChanges();
    expect(grip!.getAttribute("aria-pressed")).toBe("true");
    expect(
      root.querySelector('[data-adapttable-part="row-reorder-announcer"]')
        ?.textContent
    ).toBe("Row 1 lifted");

    grip!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    grip!.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );
    fixture.detectChanges();
    expect(
      fixture.componentInstance.onRowReorder
    ).toHaveBeenCalledExactlyOnceWith(0, 1, PEOPLE[0]);
    expect(
      root.querySelector('[data-adapttable-part="row-reorder-announcer"]')
        ?.textContent
    ).toBe("Row moved from 1 to 2");
  });

  it("disables the grip while host confirmation is pending", () => {
    const fixture = TestBed.createComponent(PendingHost);
    fixture.detectChanges();
    const grip = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(
      '[data-adapttable-part="row-reorder-handle"]'
    );
    expect(grip).not.toBeNull();
    expect(grip!.disabled).toBe(true);
    const menuItem = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>('[role="menuitem"]');
    expect(menuItem).not.toBeNull();
    expect(menuItem!.disabled).toBe(true);
  });
});

describe("AdaptRowReorderButtonsChrome", () => {
  it("moves down through the host callback", async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
    const fixture = TestBed.createComponent(ChromeHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const down = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(
      '[data-adapttable-part="row-reorder-down"]'
    );
    expect(down).not.toBeNull();
    down!.click();
    fixture.detectChanges();
    expect(
      fixture.componentInstance.onRowReorder
    ).toHaveBeenCalledExactlyOnceWith(0, 1, PEOPLE[0]);
  });
});

describe("injectRowReorder typed drag", () => {
  it("ignores a dragstart with a null dataTransfer without casting", async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
    const fixture = TestBed.createComponent(ChromeHost);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const state = fixture.componentInstance.reorder();
    const empty = Object.assign(new Event("dragstart"), {
      dataTransfer: null,
      preventDefault: vi.fn(),
    }) as unknown as DragEvent;
    state.dragProps("1", 0).onDragStart(empty);
    fixture.detectChanges();
    expect(empty.preventDefault).toHaveBeenCalled();
    expect(fixture.componentInstance.reorder().isLifted("1")).toBe(false);

    const start = dragEvent("dragstart", {
      setData: vi.fn(),
      effectAllowed: "move",
    });
    state.dragProps("1", 0).onDragStart(start);
    fixture.detectChanges();
    expect(fixture.componentInstance.reorder().isLifted("1")).toBe(true);
  });
});
