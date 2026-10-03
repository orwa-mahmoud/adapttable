import { type ColumnDef } from "@adapttable/angular";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { columnMenu } from "../column-menu";
import { filters } from "../filters";
import { ngBootstrapPart } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

interface Row {
  id: string;
  name: string;
}
const rows: Row[] = [
  { id: "a", name: "Ada" },
  { id: "g", name: "Grace" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name, sortable: true },
];

async function mount(mode: "popover" | "drawer" = "popover") {
  const fixture = TestBed.createComponent(AdaptDataTable<Row>);
  for (const [name, value] of Object.entries({
    data: rows,
    columns,
    rowKey: (row: Row) => row.id,
    urlSync: false,
    forceMobile: false,
    searchable: true,
    selectable: true,
    theme: "dark",
    dir: "rtl",
    filtersMode: mode,
    features: [filters<Row>([{ key: "name", type: "text" }]), columnMenu()],
  }))
    fixture.componentRef.setInput(name, value);
  fixture.autoDetectChanges();
  const host = fixture.nativeElement as HTMLElement;
  document.body.append(host);
  await fixture.whenStable();
  const part = (name: string) =>
    host.querySelector<HTMLElement>(ngBootstrapPart(name));
  return { fixture, host, part };
}

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.replaceChildren();
});

describe("ng-bootstrap controls and isolated overlay containers", () => {
  it("uses Bootstrap controls, ng-bootstrap pagination and a scoped color mode", async () => {
    const { host, part } = await mount();
    expect(host.classList.contains("adapttable-ng-bootstrap")).toBe(true);
    expect(host.getAttribute("data-bs-theme")).toBe("dark");
    expect(part("root")?.getAttribute("dir")).toBe("rtl");
    expect(part("table")?.classList.contains("table")).toBe(true);
    expect(part("search")?.classList.contains("form-control")).toBe(true);
    expect(part("checkbox")?.classList.contains("form-check-input")).toBe(true);
    expect(host.querySelector("ngb-pagination")).not.toBeNull();
  });

  it("opens a native popover without a backdrop and returns focus on Escape", async () => {
    const { fixture, host, part } = await mount();
    part("filters-button")!.focus();
    part("filters-button")!.click();
    await fixture.whenStable();
    expect(host.querySelector("ngb-popover-window")).not.toBeNull();
    expect(part("filters-backdrop")).toBeNull();
    expect(part("filters-button")?.getAttribute("aria-expanded")).toBe("true");
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
    );
    await fixture.whenStable();
    expect(part("filters-popover")).toBeNull();
    expect(document.activeElement).toBe(part("filters-button"));
  });

  it("keeps native drawer and backdrop in the kit scope across reopen", async () => {
    const { fixture, host, part } = await mount("drawer");
    for (let attempt = 0; attempt < 2; attempt++) {
      part("filters-button")!.click();
      await fixture.whenStable();
      expect(host.querySelector("ngb-offcanvas-panel")).not.toBeNull();
      expect(part("filters-backdrop")).not.toBeNull();
      expect(part("filters-panel")?.getAttribute("dir")).toBe("rtl");
      expect(
        document.body.querySelectorAll(":scope > ngb-offcanvas-panel")
      ).toHaveLength(0);
      part("filters-done")!.click();
      await fixture.whenStable();
      expect(host.querySelector("ngb-offcanvas-panel")).toBeNull();
      expect(part("filters-backdrop")).toBeNull();
    }
  });

  it("uses native dropdown placement for the columns menu", async () => {
    const { fixture, host, part } = await mount();
    part("column-menu-button")!.click();
    await fixture.whenStable();
    expect(
      host.querySelector(
        '[data-ng-bootstrap-part="column-menu"] .dropdown-menu.show'
      )
    ).not.toBeNull();
    expect(part("column-menu-panel")).not.toBeNull();
  });
});
