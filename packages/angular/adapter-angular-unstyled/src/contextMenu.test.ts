/**
 * The unstyled context menu: right-click, the keyboard, and a host entry.
 */
import type { ColumnDef } from "@adapttable/angular";
import { contextMenu } from "@adapttable/angular-unstyled/context-menu";
import { filters } from "@adapttable/angular-unstyled/filters";
import { rowPinning } from "@adapttable/angular-unstyled/row-pinning";
import { Component, input, signal, viewChild } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { AdaptContextMenuLive } from "../context-menu/menu";
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
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

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

describe("context menu (unstyled Angular)", () => {
  it("opens on a header, walks, and sorts", async () => {
    const fixture = await mount();
    expect(part("context-menu")).toBeNull();
    openOn(part("header-cell")!);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("context-menu-anchor")).not.toBeNull();
    expect(part("context-menu")?.getAttribute("role")).toBe("menu");
    expect(item("Sort ascending")).toBeTruthy();
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
