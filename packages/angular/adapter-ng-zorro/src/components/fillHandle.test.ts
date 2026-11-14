import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { cellNavigation } from "@adapttable/ng-zorro/cell-navigation";
import { editing } from "@adapttable/ng-zorro/editing";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, expect, it, vi } from "vitest";

import { fillHandleTests } from "../../../angular/test/kit/suites/fillHandle";
import { kit } from "../../testing/kit";
import { kitSelector } from "../../testUtils";
import { AdaptDataTable } from "../dataTable";

for (const test of fillHandleTests(kit)) it(test.name, test.run);

interface Row {
  id: string;
  name: string;
}

@Component({
  imports: [AdaptDataTable],
  template: `<adapt-data-table
    [data]="data"
    [columns]="columns"
    [rowKey]="rowKey"
    [features]="features()"
    [urlSync]="false"
  />`,
})
class Host {
  readonly data: Row[] = [
    { id: "1", name: "First" },
    { id: "2", name: "Second" },
  ];
  readonly columns: ColumnDef<Row>[] = [{ key: "name", editable: true }];
  readonly rowKey = (row: Row) => row.id;
  readonly features = input<readonly AdaptTableFeature[]>([]);
}

afterEach(() => {
  document.body.replaceChildren();
});

it("draws the fill handle as NG-ZORRO's primary button, never an empty one", async () => {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", [
    cellNavigation(),
    editing<Row>(vi.fn()),
  ]);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  document
    .querySelector<HTMLElement>('[data-adapttable-part="cell"]')!
    .dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  window.dispatchEvent(new MouseEvent("mouseup"));
  await fixture.whenStable();
  const handle = document.querySelector<HTMLElement>(
    kitSelector("fill-handle")
  )!;
  expect(handle.tagName).toBe("BUTTON");
  expect(handle.classList.contains("ant-btn-primary")).toBe(true);
  // NG-ZORRO hides .ant-btn:empty; the pointer affordance must remain drawn.
  expect(handle.matches(".ant-btn:empty")).toBe(false);
});
