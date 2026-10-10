/**
 * The context menu, bound where an adapter binds it.
 */
import type {
  ColumnMetadata,
  ContextMenuKeyEvent,
  ContextMenuPointerEvent,
  FeatureHostState,
} from "@adapttable/core";
import { Component, inject, Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { injectContextMenu } from "./contextMenu";
import {
  injectTableContextMenu,
  type TableContextMenuOptions,
} from "./tableContextMenu";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [{ id: "r1", name: "Ada" }];
const COLUMNS = [
  { key: "name", header: "Name", sortable: true, filter: "text" },
] as unknown as ColumnMetadata<Row>[];

const keys = (items: readonly { key: string }[]) =>
  items.map((item) => item.key).join(",");

@Component({
  template: `
    <div
      (contextmenu)="onContextMenu($event)"
      (keydown)="onKeyDown($event)"
      (pointerdown)="onPointerDown($event)"
      (pointermove)="onPointerMove($event)"
      (pointerup)="onPointerUp()"
      (pointercancel)="onPointerCancel()"
    >
      <table>
        <thead>
          <tr>
            <th
              data-adapttable-part="header-cell"
              data-column-key="name"
              tabindex="0"
            >
              Name
            </th>
          </tr>
        </thead>
        <tbody>
          <tr data-adapttable-part="row" data-row-id="r1">
            <td data-adapttable-part="cell" data-column-key="name">
              <span class="in-cell">Ada</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
class Host {
  readonly onCopy = vi.fn();
  readonly onSort = vi.fn();
  readonly onHide = vi.fn();
  readonly onFilter = vi.fn();
  readonly options = signal<TableContextMenuOptions<Row>>({
    contextMenu: true,
    columns: COLUMNS,
    labels: {},
    rowFor: (id) => ROWS.find((row) => row.id === id),
    actions: {
      onCopy: (target) => this.onCopy(target),
      onSort: (columnKey, direction) => this.onSort(columnKey, direction),
      onHide: (columnKey) => this.onHide(columnKey),
      onFilter: (columnKey) => this.onFilter(columnKey),
    },
    isPinned: () => false,
    rowPins: [
      { key: "pin-top", label: "Pin to top", onClick: () => undefined },
    ],
    gridNavigation: false,
  });
  readonly menu = injectTableContextMenu(this.options);

  onContextMenu(event: MouseEvent): void {
    this.menu().region.onContextMenu(event);
  }

  onKeyDown(event: KeyboardEvent): void {
    this.menu().region.onKeyDown(event);
  }

  onPointerDown(event: PointerEvent): void {
    this.menu().region.onPointerDown(event);
  }

  onPointerMove(event: PointerEvent): void {
    this.menu().region.onPointerMove(event);
  }

  onPointerUp(): void {
    this.menu().region.onPointerUp();
  }

  onPointerCancel(): void {
    this.menu().region.onPointerCancel();
  }
}

function mount(): ReturnType<typeof TestBed.createComponent<Host>> {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement);
  fixture.detectChanges();
  return fixture;
}

const header = () =>
  document.querySelector<HTMLElement>('[data-adapttable-part="header-cell"]')!;
const cell = () => document.querySelector<HTMLElement>(".in-cell")!;

describe("injectTableContextMenu", () => {
  it("offers a header its column actions and a cell the clipboard", () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    header().dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 5,
        clientY: 6,
      })
    );
    expect(keys(host.menu().items)).toBe("sort-asc,sort-desc,filter,hide");
    expect(host.menu().at).toEqual({ x: 5, y: 6 });
    host.menu().items[0]?.onSelect();
    expect(host.onSort).toHaveBeenCalledWith("name", "asc");
    host.menu().close();
    expect(host.menu().at).toBeNull();

    cell().dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 8,
        clientY: 9,
      })
    );
    expect(keys(host.menu().items)).toBe("copy,row-pin:pin-top");
    host.menu().items[0]?.onSelect();
    expect(host.onCopy).not.toHaveBeenCalled();
    fixture.destroy();
  });

  it("keeps Copy on the host when cell navigation is on", () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    host.options.update((options) => ({ ...options, gridNavigation: true }));
    fixture.detectChanges();
    cell().dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 1,
        clientY: 2,
      })
    );
    host.menu().items[0]?.onSelect();
    expect(host.onCopy).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it("opens from Shift+F10 and the menu key, and ignores other keys", () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    header().dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true })
    );
    expect(host.menu().at).toBeNull();
    header().dispatchEvent(
      new KeyboardEvent("keydown", { key: "F10", bubbles: true })
    );
    expect(host.menu().at).toBeNull();
    header().dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "F10",
        shiftKey: true,
        bubbles: true,
      })
    );
    expect(host.menu().at).not.toBeNull();
    host.menu().close();
    cell().dispatchEvent(
      new KeyboardEvent("keydown", { key: "ContextMenu", bubbles: true })
    );
    expect(keys(host.menu().items)).toBe("copy,row-pin:pin-top");
    fixture.destroy();
  });

  it("stays shut for a miss, a false prop, and a row that is gone", () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    fixture.nativeElement.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 1,
        clientY: 1,
      })
    );
    expect(host.menu().at).toBeNull();

    const gone = document.createElement("td");
    const row = document.createElement("tr");
    row.dataset.adapttablePart = "row";
    row.dataset.rowId = "gone";
    row.append(gone);
    fixture.nativeElement.append(row);
    gone.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 3,
        clientY: 4,
      })
    );
    expect(host.menu().at).toBeNull();

    host.options.set({
      contextMenu: false,
      columns: COLUMNS,
      labels: {},
      rowFor: () => undefined,
      actions: {},
    });
    fixture.detectChanges();
    const region = host.menu().region;
    cell().dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 1, clientY: 1 })
    );
    region.onKeyDown(new KeyboardEvent("keydown", { key: "F10" }));
    region.onPointerDown(new PointerEvent("pointerdown"));
    region.onPointerMove(new PointerEvent("pointermove"));
    region.onPointerUp();
    region.onPointerCancel();
    expect(host.menu().at).toBeNull();
    expect(host.menu().items).toEqual([]);
    fixture.destroy();
  });

  it("appends host entries and entries a feature registered", () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    host.options.update((options) => ({
      ...options,
      contextMenu: {
        items: () => [
          { key: "audit", label: "Audit", onSelect: () => undefined },
        ],
      },
      sortBy: "name",
      sortDir: "asc",
      isPinned: () => true,
    }));
    fixture.detectChanges();
    cell().dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 2,
        clientY: 3,
      })
    );
    expect(keys(host.menu().items)).toBe("copy,row-pin:pin-top,audit");
    host.menu().close();

    host.options.set({
      columns: COLUMNS,
      labels: {},
      rowFor: (id) => ROWS.find((row) => row.id === id),
      actions: { onCopy: () => undefined },
      featureHost: {
        contextMenuItems: [
          () => [{ key: "plug", label: "Plug", onSelect: () => undefined }],
        ],
      } as unknown as FeatureHostState,
    });
    fixture.detectChanges();
    cell().dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 2,
        clientY: 3,
      })
    );
    expect(keys(host.menu().items)).toBe("copy,plug");

    host.options.update((options) => ({ ...options, contextMenu: false }));
    fixture.detectChanges();
    expect(host.menu().at).toBeNull();
    expect(host.menu().items).toEqual([]);
    fixture.destroy();
  });

  it("opens on a long press and abandons one that moves, lifts, or is cancelled", async () => {
    const fixture = mount();
    const host = fixture.componentInstance;
    const press = () =>
      cell().dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          pointerType: "touch",
          clientX: 8,
          clientY: 9,
        })
      );
    press();
    await new Promise((resolve) => setTimeout(resolve, 520));
    expect(host.menu().at).toEqual({ x: 8, y: 9 });
    host.menu().close();

    press();
    cell().dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        clientX: 8,
        clientY: 40,
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 520));
    expect(host.menu().at).toBeNull();

    press();
    cell().dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 520));
    expect(host.menu().at).toBeNull();

    press();
    cell().dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 520));
    expect(host.menu().at).toBeNull();
    fixture.destroy();
  });
});

@Component({
  template: `<button
    type="button"
    (contextmenu)="open($event)"
    (keydown)="key($event)"
  >
    cell
  </button>`,
})
class TriggerHost {
  readonly enabled = signal(true);
  readonly menu: ReturnType<typeof injectContextMenu<Row>>;

  constructor() {
    this.menu = injectContextMenu<Row>(this.enabled, inject(Injector));
  }

  open(event: MouseEvent): void {
    this.menu()
      .triggerProps({ kind: "header", columnKey: "name" })
      .onContextMenu(event as unknown as ContextMenuPointerEvent);
  }

  key(event: KeyboardEvent): void {
    this.menu()
      .triggerProps({ kind: "header", columnKey: "name" })
      .onKeyDown(event as unknown as ContextMenuKeyEvent);
  }
}

describe("injectContextMenu", () => {
  it("opens from a trigger and stays shut when disabled", () => {
    const fixture = TestBed.createComponent(TriggerHost);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const button = fixture.nativeElement.querySelector(
      "button"
    ) as HTMLButtonElement;
    expect(host.menu().open).toBeNull();
    button.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: 4,
        clientY: 5,
      })
    );
    expect(host.menu().open?.at).toEqual({ x: 4, y: 5 });
    host.menu().close();
    expect(host.menu().open).toBeNull();
    button.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ContextMenu", bubbles: true })
    );
    expect(host.menu().open).not.toBeNull();
    host.enabled.set(false);
    fixture.detectChanges();
    expect(host.menu().open).toBeNull();
    button.dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, clientX: 1, clientY: 1 })
    );
    expect(host.menu().open).toBeNull();
    fixture.destroy();
  });
});
