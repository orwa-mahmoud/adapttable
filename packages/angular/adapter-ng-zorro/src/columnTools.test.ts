/**
 * Column tools on the NG-ZORRO table: a multi-sort badge, a resize handle,
 * a header's own text, a phone sort select, and renaming from the header.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type {
  AdaptTableFeature,
  ColumnDef,
  ColumnLayoutState,
} from "@adapttable/angular";
import { multiSort } from "@adapttable/ng-zorro/multi-sort";
import { resizableColumns } from "@adapttable/ng-zorro/resizable-columns";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { columnToolsTests } from "../../angular/test/kit/suites/columnTools";
import { kit } from "../testing/kit";
import { kitSelector } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

for (const test of columnToolsTests(kit)) it(test.name, test.run);

interface City {
  id: string;
  name: string;
  country: string;
}

const CITIES: City[] = [
  { id: "1", name: "Dubai", country: "UAE" },
  { id: "2", name: "Amman", country: "Jordan" },
];

const COLUMNS: ColumnDef<City>[] = [
  {
    key: "name",
    header: "Name",
    sortable: true,
    renameable: true,
    headerActions: "info",
    accessor: (row) => row.name,
  },
  {
    key: "country",
    header: "Country",
    sortable: true,
    accessor: (row) => row.country,
  },
];

let features: AdaptTableFeature[] = [];
let mobile = false;
let dir: "ltr" | "rtl" = "ltr";
const renamed = vi.fn();

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile"
      [dir]="dir"
      [features]="features"
      [defaultColumnLayout]="defaultColumnLayout"
      (columnLayoutChange)="layouts.push($event)"
    />
  `,
})
class Host {
  readonly rows = CITIES;
  readonly columns = COLUMNS;
  readonly rowKey = (row: City) => row.id;
  readonly features = features;
  readonly mobile = mobile;
  readonly dir = dir;
  readonly onColumnRename = renamed;
  readonly defaultColumnLayout = { widths: { name: 150, country: 120 } };
  readonly layouts: ColumnLayoutState[] = [];
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture;
}

const parts = (name: string) => [
  ...document.querySelectorAll<HTMLElement>(kitSelector(name)),
];

afterEach(() => {
  document.dispatchEvent(new MouseEvent("pointercancel"));
  document.body.replaceChildren();
  features = [];
  mobile = false;
  dir = "ltr";
  renamed.mockClear();
  vi.restoreAllMocks();
});

describe("the NG-ZORRO table's column tools", () => {
  it("badges a multi-sort chain and draws a resize handle and header text", async () => {
    features = [multiSort(), resizableColumns()];
    const fixture = await mount();
    const buttons = parts("sort-button");
    buttons[0]!.click();
    await fixture.whenStable();
    buttons[1]!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true })
    );
    await fixture.whenStable();
    const indexes = parts("sort-index").map((badge) =>
      badge.textContent.trim()
    );
    expect(indexes).toEqual(["1", "2"]);
    const handle = parts("resize-handle")[0]!;
    expect(handle.getAttribute("role")).toBe("button");
    expect(handle.getAttribute("aria-label")).toBe("Resize column: Name");
    expect(parts("header-actions")[0]!.textContent.trim()).toBe("info");
    // The handle is an empty nz-button; NG-ZORRO collapses .ant-btn:empty, so
    // the kit's size rule names the class to stay ahead of it.
    expect(handle.matches(".ant-btn:empty")).toBe(true);
    const css = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "components/desktopTable.css"
      ),
      "utf8"
    );
    expect(css).toMatch(
      /nz-table \.ant-btn\[data-adapttable-part="resize-handle"\] \{[^}]*inline-size: 8px;/
    );
  });

  it("offers a sort select on a phone", async () => {
    mobile = true;
    const fixture = await mount();
    const select = parts("sort-select")[0]!;
    expect(select.matches("nz-select.ant-select")).toBe(true);
    select.querySelector<HTMLElement>("nz-select-top-control")!.click();
    await fixture.whenStable();
    await vi.waitFor(() =>
      expect(document.querySelector(".ant-select-item-option")).not.toBeNull()
    );
    const options = [
      ...document.querySelectorAll<HTMLElement>(".ant-select-item-option"),
    ];
    expect(options.map((option) => option.textContent?.trim())).toEqual([
      "—",
      "Name",
      "Country",
    ]);
    options[2]!.click();
    await fixture.whenStable();
    const cards = parts("card").map((card) => card.textContent ?? "");
    expect(cards[0]).toContain("Amman");
    const direction = parts("sort-direction")[0]! as HTMLButtonElement;
    expect(direction.getAttribute("aria-label")).toBe("Sort descending");
    direction.click();
    await fixture.whenStable();
    expect(parts("card")[0]?.textContent).toContain("Dubai");
    expect(direction.getAttribute("aria-label")).toBe("Sort ascending");
    direction.click();
    await fixture.whenStable();
    expect(parts("card")[0]?.textContent).toContain("Amman");
  });
});
