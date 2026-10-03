/**
 * Keyboard reorder stays on the loaded page — rowCount is on-screen rows,
 * not the source total — and the kit controls call through to the host.
 */
import {
  type ColumnDef,
  type PaginationMode,
  type RowReorderState,
} from "@adapttable/angular";
import { rowReorder } from "@adapttable/spartan/row-reorder";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "../src/dataTable";
import { AdaptRowMoveMenu } from "./rowMoveMenu";
import { AdaptRowReorderButtons } from "./rowReorderButtons";
import { AdaptRowReorderGrip } from "./rowReorderGrip";

interface Task {
  id: string;
  title: string;
}

const ROWS: Task[] = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  title: `Task ${String(i + 1).padStart(2, "0")}`,
}));

const COLUMNS: ColumnDef<Task>[] = [
  { key: "title", accessor: (row) => row.title },
];

const LABELS = {
  reorderRow: "Reorder row",
  moveRowUp: "Move row up",
  moveRowDown: "Move row down",
  rowLifted: () => "",
  rowMoved: () => "",
  rowReorderCancelled: "",
  moveToGroup: "Move to group…",
  confirmRowMoveTitle: "Confirm row move",
  confirmRowMoveDescription: (row: string, from: string, to: string) =>
    `Move ${row} from ${from} to ${to}?`,
  confirmRowMove: "Move",
  cancel: "Cancel",
};

function stubReorder(
  overrides: Partial<RowReorderState<Task>> = {}
): RowReorderState<Task> {
  return {
    lifted: null,
    overIndex: null,
    overPosition: null,
    pendingMove: null,
    hostConfirmPending: false,
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
    moveMenu: () => undefined,
    selectMoveTarget: () => undefined,
    confirmMove: () => undefined,
    cancelMove: () => undefined,
    rowAttrs: () => ({}),
    ...overrides,
  };
}
@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [defaults]="{ limit: 10 }"
      [features]="features"
      [paginationMode]="paginationMode()"
      [forceMobile]="forceMobile()"
    />
  `,
})
class ReorderHost {
  readonly data = ROWS;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Task) => row.id;
  readonly onRowReorder = vi.fn();
  readonly features = [rowReorder(this.onRowReorder)];
  readonly paginationMode = input<PaginationMode>("paged");
  readonly forceMobile = input<boolean | undefined>(undefined);
}

async function mount(
  mode: PaginationMode,
  options: { forceMobile?: boolean } = {}
) {
  const fixture = TestBed.createComponent(ReorderHost);
  fixture.componentRef.setInput("paginationMode", mode);
  if (options.forceMobile !== undefined) {
    fixture.componentRef.setInput("forceMobile", options.forceMobile);
  }
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  return {
    fixture,
    element,
    onRowReorder: fixture.componentInstance.onRowReorder,
    settle: () => fixture.whenStable(),
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("row reorder feature factory", () => {
  it("arms slots with optional move policy options", () => {
    const feature = rowReorder(vi.fn(), { movePolicy: "confirm" });
    expect(feature.id).toBe("row-reorder");
    expect(feature.renders?.length).toBe(3);
  });
});

describe("row reorder on phones", () => {
  it("moves a card down through onRowReorder with the right indexes", async () => {
    const { element, onRowReorder, settle } = await mount("paged", {
      forceMobile: true,
    });
    const cards = [
      ...element.querySelectorAll<HTMLElement>('[data-adapttable-part="card"]'),
    ];
    expect(cards.length).toBeGreaterThanOrEqual(2);
    const down = cards[0]!.querySelector<HTMLButtonElement>(
      '[data-adapttable-part="row-reorder-down"]'
    );
    expect(down).not.toBeNull();
    down!.click();
    await settle();
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
  });
});

describe("row reorder keyboard page clamp", () => {
  it("clamps ArrowDown to the paged page, not the source total", async () => {
    const { element, onRowReorder, settle } = await mount("paged");
    const grips = [
      ...element.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="row-reorder-handle"]'
      ),
    ];
    expect(grips).toHaveLength(10);
    const grip = grips[0];
    expect(grip).not.toBeUndefined();

    grip!.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );
    await settle();
    for (let i = 0; i < 15; i += 1) {
      grip!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
      );
    }
    grip!.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );
    await settle();

    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 9, ROWS[0]);
  });

  it("clamps ArrowDown to the loaded infinite window, not the source total", async () => {
    const { element, onRowReorder, settle } = await mount("infinite");
    const grips = [
      ...element.querySelectorAll<HTMLElement>(
        '[data-adapttable-part="row-reorder-handle"]'
      ),
    ];
    expect(grips.length).toBeGreaterThanOrEqual(10);
    expect(grips.length).toBeLessThan(50);
    const grip = grips[0];
    expect(grip).not.toBeUndefined();
    const loadedCount = grips.length;

    grip!.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );
    await settle();
    for (let i = 0; i < loadedCount + 5; i += 1) {
      grip!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
      );
    }
    grip!.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true })
    );
    await settle();

    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(
      0,
      loadedCount - 1,
      ROWS[0]
    );
  });
});

@Component({
  imports: [AdaptRowReorderButtons],
  template: `<adapt-row-reorder-buttons [props]="props" />`,
})
class ButtonsHost {
  readonly onRowReorder = vi.fn();
  readonly props = {
    reorder: stubReorder({
      moveBy: (localIndex, delta, row) => {
        this.onRowReorder(localIndex, localIndex + delta, row);
      },
    }),
    labels: LABELS,
    localIndex: 0,
    row: ROWS[0]!,
    windowStart: 0,
    rowCount: 3,
  };
}

@Component({
  imports: [AdaptRowReorderButtons],
  template: `<adapt-row-reorder-buttons [props]="props" />`,
})
class PendingButtonsHost {
  readonly props = {
    reorder: stubReorder({ hostConfirmPending: true }),
    labels: LABELS,
    localIndex: 1,
    row: ROWS[1]!,
    windowStart: 0,
    rowCount: 3,
  };
}

@Component({
  imports: [AdaptRowReorderGrip],
  template: `<adapt-row-reorder-grip [props]="props" />`,
})
class GripHost {
  readonly props = {
    reorder: stubReorder({
      isLifted: (id) => id === "1",
      hostConfirmPending: true,
      moveMenu: () => ({
        kind: "group" as const,
        label: "Move to group…",
        targets: [{ id: "docs", label: "Docs" }],
      }),
    }),
    labels: LABELS,
    rowId: "1",
    localIndex: 0,
    row: ROWS[0]!,
    windowStart: 0,
    rowCount: 3,
  };
}

@Component({
  imports: [AdaptRowMoveMenu],
  template: `<adapt-row-move-menu [props]="menuProps" />`,
})
class MenuHost {
  readonly onConfirm = vi.fn();
  readonly onCancel = vi.fn();
  menuProps = {
    label: "Move to group…",
    items: [
      {
        id: "docs",
        label: "Docs",
        disabled: false,
        onSelect: () => undefined,
      },
    ],
    confirmation: {
      title: "Confirm row move",
      description: "Move Ada from A to B?",
      confirmLabel: "Move",
      cancelLabel: "Cancel",
      onConfirm: () => {
        this.onConfirm();
      },
      onCancel: () => {
        this.onCancel();
      },
    },
  };
}

describe("row reorder kit controls", () => {
  it("moves down through the host callback from the kit buttons", () => {
    const fixture = TestBed.createComponent(ButtonsHost);
    fixture.detectChanges();
    const up = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(
      '[data-adapttable-part="row-reorder-up"]'
    );
    const down = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(
      '[data-adapttable-part="row-reorder-down"]'
    );
    expect(up).not.toBeNull();
    expect(down).not.toBeNull();
    expect(up!.disabled).toBe(true);
    down!.click();
    expect(
      fixture.componentInstance.onRowReorder
    ).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
  });

  it("disables both buttons while host confirmation is pending", () => {
    const fixture = TestBed.createComponent(PendingButtonsHost);
    fixture.detectChanges();
    const buttons = [
      ...(
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLButtonElement>(
        '[data-adapttable-part="row-reorder-up"], [data-adapttable-part="row-reorder-down"]'
      ),
    ];
    expect(buttons).toHaveLength(2);
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it("presses the grip and disables it while pending", () => {
    const fixture = TestBed.createComponent(GripHost);
    fixture.detectChanges();
    const grip = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(
      '[data-adapttable-part="row-reorder-handle"]'
    );
    expect(grip).not.toBeNull();
    expect(grip!.getAttribute("aria-pressed")).toBe("true");
    expect(grip!.disabled).toBe(true);
    const item = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>('[role="menuitem"]');
    expect(item).not.toBeNull();
    expect(item!.disabled).toBe(true);
  });

  it("confirms a pending destination from the move menu", () => {
    const fixture = TestBed.createComponent(MenuHost);
    fixture.detectChanges();
    const dialog = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-adapttable-part="row-move-confirmation"]'
    );
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain("Move Ada from A to B?");
    const confirm = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll("button")
    ).find((button) => button.textContent?.trim() === "Move");
    expect(confirm).not.toBeUndefined();
    confirm!.click();
    expect(fixture.componentInstance.onConfirm).toHaveBeenCalledOnce();
  });

  it("cancels a pending destination with Escape", () => {
    const fixture = TestBed.createComponent(MenuHost);
    fixture.detectChanges();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    expect(fixture.componentInstance.onCancel).not.toHaveBeenCalled();
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        keyCode: 27,
        bubbles: true,
      })
    );
    expect(fixture.componentInstance.onCancel).toHaveBeenCalledOnce();
  });

  it("cancels a pending destination with the cancel button", () => {
    const fixture = TestBed.createComponent(MenuHost);
    fixture.detectChanges();
    const cancel = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll("button")
    ).find((button) => button.textContent?.trim() === "Cancel");
    expect(cancel).not.toBeUndefined();
    cancel!.click();
    expect(fixture.componentInstance.onCancel).toHaveBeenCalledOnce();
  });

  it("selects a destination item when no confirmation is pending", () => {
    @Component({
      imports: [AdaptRowMoveMenu],
      template: `<adapt-row-move-menu [props]="menuProps" />`,
    })
    class ItemsHost {
      readonly onSelect = vi.fn();
      readonly menuProps = {
        label: "Move to group…",
        items: [
          {
            id: "docs",
            label: "Docs",
            disabled: false,
            onSelect: () => {
              this.onSelect();
            },
          },
          {
            id: "blocked",
            label: "Blocked",
            disabled: true,
            disabledReason: "not allowed",
            onSelect: () => undefined,
          },
        ],
      };
    }
    const fixture = TestBed.createComponent(ItemsHost);
    fixture.detectChanges();
    const items = [
      ...(
        fixture.nativeElement as HTMLElement
      ).querySelectorAll<HTMLButtonElement>(
        '[data-adapttable-part="row-move-menu-item"]'
      ),
    ];
    expect(items).toHaveLength(2);
    expect(items[1]!.disabled).toBe(true);
    items[0]!.click();
    expect(fixture.componentInstance.onSelect).toHaveBeenCalledOnce();
  });
});
