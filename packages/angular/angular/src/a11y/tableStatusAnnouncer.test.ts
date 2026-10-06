/**
 * The region and the tracker that feeds it.
 *
 * The resolver's wording lives in core. What a render has to show is the part
 * that is easy to get wrong: the region is in the DOM from the first paint, it
 * starts empty, and it does not claim a second `role="status"`.
 */
import { createMemoryAdapter, resolveLabels } from "@adapttable/core";
import { Component, inject, Injector, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import type { ColumnDef } from "../columnDef";
import { injectFrontendData } from "../source/frontendData";
import { ADAPTTABLE_URL_ADAPTER } from "../url/tableUrlState";
import { AdaptTableStatusAnnouncer } from "./tableStatusAnnouncer";
import { trackTableStatus } from "./tableStatusState";

interface Row {
  id: string;
  name: string;
}

const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
];

const ROWS: Row[] = Array.from({ length: 100 }, (_, index) => ({
  id: String(index + 1),
  name: `Row ${String(index + 1)}`,
}));

@Component({
  imports: [AdaptTableStatusAnnouncer],
  template: `
    <adapt-table-status-announcer [announcement]="announcement()" />
  `,
})
class Host {
  readonly source = injectFrontendData<Row>({
    data: ROWS,
    columns: COLUMNS,
    paginationMode: "paged",
    defaults: { limit: 25 },
    urlSync: false,
  });
  readonly announcement = trackTableStatus(
    this.source,
    signal(resolveLabels(undefined)),
    signal(COLUMNS),
    inject(Injector)
  );
}

const region = () =>
  document.querySelector<HTMLElement>(
    '[data-adapttable-part="table-status-announcer"]'
  );

describe("AdaptTableStatusAnnouncer", () => {
  it("is present and silent from the first paint, and speaks when the page moves", async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: ADAPTTABLE_URL_ADAPTER, useValue: createMemoryAdapter() },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    document.body.append(fixture.nativeElement as HTMLElement);
    fixture.autoDetectChanges();
    await fixture.whenStable();

    const live = region();
    expect(live).not.toBeNull();
    expect(live?.textContent).toBe("");
    expect(live?.getAttribute("aria-live")).toBe("polite");
    expect(live?.getAttribute("aria-atomic")).toBe("true");
    expect(live?.getAttribute("role")).toBeNull();
    expect(document.querySelector("[role='status']")).toBeNull();

    fixture.componentInstance.source().setPage(3);
    await fixture.whenStable();

    expect(region()?.textContent).toBe("Page 3 of 4. Showing 51–75 of 100");
  });
});
