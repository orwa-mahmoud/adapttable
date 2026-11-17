/**
 * The unstyled side panel: a docked frame, its tabs, and the close control.
 */
import type { ColumnDef } from "@adapttable/angular";
import { sidePanel } from "@adapttable/ng-bootstrap/side-panel";
import { Component, computed, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it, vi } from "vitest";

import { sidePanelTests } from "../../angular/test/kit/suites/sidePanel";
import { kit } from "../testing/kit";
import { ngBootstrapPart } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

for (const test of sidePanelTests(kit)) it(test.name, test.run);

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Zoe" },
];

const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
];

const part = (name: string) =>
  document.querySelector<HTMLElement>(ngBootstrapPart(name));

const tab = (label: string) =>
  [
    ...document.querySelectorAll<HTMLElement>(
      '[data-adapttable-part="side-panel-tab"]'
    ),
  ].find((button) => button.textContent?.includes(label));

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="false"
      [features]="features()"
    />
  `,
})
class Host {
  readonly rows = ROWS;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Row) => row.id;
  readonly enabled = input(true);
  readonly open = signal<string | null>("one");
  readonly side = signal<"start" | "end">("end");
  readonly opened = vi.fn();
  readonly features = computed(() =>
    this.enabled()
      ? [
          sidePanel({
            panels: [
              { key: "one", label: "One", content: "panel one" },
              { key: "two", label: "Two", content: "panel two" },
            ],
            open: this.open(),
            side: this.side(),
            onOpenChange: (key) => {
              this.opened(key);
              this.open.set(key);
            },
          }),
        ]
      : []
  );
}

async function mount(
  enabled = true
): Promise<ReturnType<typeof TestBed.createComponent<Host>>> {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("enabled", enabled);
  document.body.append(fixture.nativeElement);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

describe("sidePanel", () => {
  it("docks the open panel and answers the tabs and the close control", async () => {
    const absent = await mount(false);
    expect(part("side-panel")).toBeNull();
    absent.destroy();

    const fixture = await mount();
    const host = fixture.componentInstance;
    expect(part("side-panel")?.textContent).toContain("panel one");
    expect(part("side-panel")?.textContent).not.toContain("panel two");
    expect(part("side-panel")?.getAttribute("data-side")).toBe("end");
    expect(tab("One")?.getAttribute("aria-selected")).toBe("true");
    expect(part("side-panel-close")?.getAttribute("aria-label")).toBe(
      "Close panel"
    );

    tab("Two")?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.opened).toHaveBeenCalledWith("two");
    expect(part("side-panel")?.textContent).toContain("panel two");
    expect(part("side-panel")?.textContent).not.toContain("panel one");
    expect(tab("Two")?.getAttribute("aria-selected")).toBe("true");

    host.side.set("start");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(part("side-panel")?.getAttribute("data-side")).toBe("start");

    part("side-panel-close")?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.opened).toHaveBeenCalledWith(null);
    expect(part("side-panel")).toBeNull();
  });
});
