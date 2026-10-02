/**
 * The NG-ZORRO context menu: right-click, the keyboard, and a host entry.
 */
import type { ColumnDef } from "@adapttable/angular";
import { contextMenu } from "@adapttable/ng-zorro/context-menu";
import { filters } from "@adapttable/ng-zorro/filters";
import { rowPinning } from "@adapttable/ng-zorro/row-pinning";
import { Component, computed, input, signal, viewChild } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import {
  AdaptContextMenuItem,
  AdaptContextMenuLive,
  AdaptContextMenuSeparator,
  AdaptContextMenuSurface,
} from "../context-menu/menu";
import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Zoe" },
];

const COLUMNS: ColumnDef<Row>[] = [
  {
    key: "name",
    header: "Name",
    accessor: (row) => row.name,
    sortable: true,
    filter: "text",
  },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(kitSelector(name));

const items = () => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-adapttable-part="context-menu-item"]'
  ),
];

const item = (label: string) =>
  items().find((entry) => entry.textContent?.includes(label));

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [features]="features"
      [cellNavigation]="navigable()"
      [onCellCut]="cut"
    />
  `,
})
class Host {
  readonly rows = ROWS;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Row) => row.id;
  readonly navigable = input(false);
  readonly audited = vi.fn();
  readonly cut = vi.fn();
  readonly features = [
    contextMenu({
      items: () => [
        {
          key: "audit",
          label: "Audit",
          danger: true,
          onSelect: () => {
            this.audited();
          },
        },
      ],
    }),
    filters(),
    rowPinning(),
  ];
}

@Component({
  imports: [AdaptContextMenuSurface],
  template: `
    <div dir="rtl">
      <button type="button" class="outside">Outside</button>
      @if (open()) {
        <adapt-context-menu-surface [props]="props()" />
      }
    </div>
  `,
})
class SurfaceHost {
  readonly open = signal(true);
  readonly disabled = signal(false);
  readonly close = vi.fn(() => this.open.set(false));
  readonly select = vi.fn();
  readonly props = computed(() => ({
    at: { x: 20, y: 30 },
    label: "Row actions",
    onClose: this.close,
    rows: [
      {
        item: { key: "unavailable", label: "Unavailable", disabled: true },
        onSelect: this.select,
      },
      {
        item: { key: "audit", label: "Audit", disabled: this.disabled() },
        onSelect: this.select,
      },
      {
        item: { key: "inspect", label: "Inspect", disabled: this.disabled() },
        onSelect: this.select,
      },
    ],
    Item: AdaptContextMenuItem,
    Separator: AdaptContextMenuSeparator,
  }));
}

async function mount(
  navigable = false
): Promise<ReturnType<typeof TestBed.createComponent<Host>>> {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("navigable", navigable);
  document.body.append(fixture.nativeElement);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

function openOn(target: HTMLElement): void {
  target.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 20,
      clientY: 30,
    })
  );
}

describe("context menu (NG-ZORRO Angular)", () => {
  it("inherits RTL and skips disabled entries when placing and cycling keyboard focus", async () => {
    const fixture = TestBed.createComponent(SurfaceHost);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const menu = part("context-menu")!;
    const unavailable = item("Unavailable") as HTMLButtonElement;
    expect(menu.dir).toBe("rtl");
    expect(menu.getAttribute("aria-label")).toBe("Row actions");
    expect(unavailable.disabled).toBe(true);
    expect(document.activeElement).toBe(item("Audit"));
    menu.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowUp",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).toBe(item("Inspect"));
    menu.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).toBe(item("Audit"));
    menu.focus();
    menu.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    expect(document.activeElement).toBe(item("Audit"));
    const escape = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    menu.dispatchEvent(escape);
    await fixture.whenStable();
    expect(escape.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.close).toHaveBeenCalledOnce();
    expect(part("context-menu")).toBeNull();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(fixture.componentInstance.close).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it("leaves focus in place when every entry is disabled and still dismisses outside", async () => {
    const fixture = TestBed.createComponent(SurfaceHost);
    fixture.componentInstance.disabled.set(true);
    document.body.append(fixture.nativeElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const outside = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>(".outside")!;
    outside.focus();
    const menu = part("context-menu")!;
    expect(items()).toHaveLength(3);
    expect(items().every((entry) => entry.hasAttribute("disabled"))).toBe(true);
    for (const key of ["ArrowDown", "ArrowUp"]) {
      const arrow = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      menu.dispatchEvent(arrow);
      expect(arrow.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(outside);
    }
    expect(fixture.componentInstance.close).not.toHaveBeenCalled();
    expect(fixture.componentInstance.select).not.toHaveBeenCalled();
    outside.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.close).toHaveBeenCalledOnce();
    expect(part("context-menu")).toBeNull();
    expect(document.activeElement).toBe(outside);
    fixture.destroy();
  });

  it("opens on a header, walks, and sorts", async () => {
    const fixture = await mount();
    expect(part("context-menu")).toBeNull();
    openOn(part("header-cell")!);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("context-menu-anchor")).not.toBeNull();
    expect(part("context-menu")?.getAttribute("role")).toBe("menu");
    expect(part("context-menu")?.closest(".ant-popover")).not.toBeNull();
    expect(item("Sort ascending")?.classList.contains("ant-btn")).toBe(true);
    expect(item("Sort ascending")).toBeTruthy();
    expect(
      items().every((entry) => entry.getAttribute("tabindex") === "-1")
    ).toBe(true);
    expect(document.activeElement).toBe(item("Sort ascending"));
    part("context-menu")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true })
    );
    expect(part("context-menu")).not.toBeNull();
    part("context-menu")!.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true })
    );
    expect(part("context-menu")).not.toBeNull();
    part("context-menu")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })
    );
    expect(document.activeElement).toBe(items().at(-1));
    part("context-menu")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    expect(document.activeElement).toBe(item("Sort ascending"));
    part("context-menu")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })
    );
    expect(document.activeElement).toBe(item("Sort descending"));
    part("context-menu")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })
    );
    expect(document.activeElement).toBe(item("Sort ascending"));
    part("context-menu")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    fixture.detectChanges();
    expect(part("context-menu")).toBeNull();

    openOn(part("header-cell")!);
    fixture.detectChanges();
    await fixture.whenStable();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    fixture.detectChanges();
    expect(part("context-menu")).toBeNull();

    openOn(part("header-cell")!);
    fixture.detectChanges();
    await fixture.whenStable();
    item("Sort descending")!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("context-menu")).toBeNull();
    expect(part("cell")?.textContent).toContain("Zoe");
    fixture.destroy();
  });

  it("copies, cuts, and runs a host entry from a cell", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const fixture = await mount(true);
    const host = fixture.componentInstance;
    openOn(part("cell")!);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(item("Copy")).toBeTruthy();
    expect(item("Cut")).toBeTruthy();
    expect(item("Pin to top")).toBeTruthy();
    expect(item("Audit")?.getAttribute("data-danger")).toBe("");
    expect(part("context-menu-separator")).not.toBeNull();
    item("Audit")!.click();
    fixture.detectChanges();
    expect(host.audited).toHaveBeenCalledOnce();
    expect(part("context-menu")).toBeNull();

    openOn(part("cell")!);
    fixture.detectChanges();
    await fixture.whenStable();
    item("Cut")!.click();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(writeText).toHaveBeenCalled();
    expect(host.cut).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it("offers Copy without Cut when the host did not wire a cut", async () => {
    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [forceMobile]="false"
          [cellNavigation]="true"
          [features]="features"
        />
      `,
    })
    class Navigable {
      readonly rows = ROWS;
      readonly columns = COLUMNS;
      readonly rowKey = (row: Row) => row.id;
      readonly features = [contextMenu()];
    }

    const fixture = TestBed.createComponent(Navigable);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    openOn(part("cell")!);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(item("Copy")).toBeTruthy();
    expect(item("Cut")).toBeUndefined();
    fixture.destroy();
  });

  it("opens the filters panel from the header", async () => {
    const fixture = await mount();
    openOn(part("header-cell")!);
    fixture.detectChanges();
    await fixture.whenStable();
    item("Filter column")!.click();
    fixture.detectChanges();
    expect(part("filters-button")?.getAttribute("data-active")).toBe("");
    fixture.destroy();
  });

  it("draws nothing when the feature is absent", async () => {
    expect(contextMenu()).toBeTruthy();
    expect(contextMenu(false)).toBeTruthy();

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [forceMobile]="false"
        />
      `,
    })
    class Plain {
      readonly rows = ROWS;
      readonly columns = COLUMNS;
      readonly rowKey = (row: Row) => row.id;
    }

    const fixture = TestBed.createComponent(Plain);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const header = part("header-cell")!;
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 1,
      clientY: 1,
    });
    header.dispatchEvent(event);
    fixture.detectChanges();
    expect(event.defaultPrevented).toBe(false);
    expect(part("context-menu")).toBeNull();
    fixture.destroy();
  });

  it("publishes nothing when the table did not provide the token", async () => {
    @Component({
      imports: [AdaptContextMenuLive],
      template: `
        <adapt-context-menu-live [props]="props()" />
        <th data-adapttable-part="header-cell" data-column-key="name">Name</th>
      `,
    })
    class Bare {
      readonly props = signal({
        contextMenu: true,
        columns: COLUMNS,
        labels: {},
        rowFor: (id: string) => ROWS.find((row) => row.id === id),
        actions: { onSort: () => undefined, onHide: () => undefined },
      });
      readonly live = viewChild.required(AdaptContextMenuLive);
    }

    const fixture = TestBed.createComponent(Bare);
    document.body.append(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    const header = part("header-cell")!;
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 6,
      clientY: 7,
    });
    header.dispatchEvent(event);
    fixture.componentInstance.live().menu().region.onContextMenu(event);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("context-menu")).not.toBeNull();
    expect(item("Sort ascending")).toBeTruthy();
    fixture.destroy();
  });
});
