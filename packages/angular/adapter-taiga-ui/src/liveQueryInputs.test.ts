import {
  ADAPTTABLE_URL_ADAPTER,
  type AdaptTableFeature,
  type ColumnDef,
  type PaginationMode,
  type TableQueryHandler,
  type UrlStateAdapter,
} from "@adapttable/angular";
import { createMemoryAdapter } from "@adapttable/core";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "./dataTable";

/** Live query inputs change the mounted kit while its data and features stay put. */

interface City {
  id: string;
  name: string;
}

const CITIES: City[] = Array.from({ length: 12 }, (_, index) => ({
  id: String(index + 1),
  name: `City ${String(index + 1).padStart(2, "0")}`,
}));

const COLUMNS: ColumnDef<City>[] = [
  { key: "name", sortable: true, accessor: (row) => row.name },
];

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      mode="frontend"
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      [defaults]="defaults()"
      [paginationMode]="paginationMode()"
      [urlKey]="urlKey()"
      [urlSync]="urlSync()"
      [forceMobile]="mobile()"
      [onQueryChange]="notified"
    />
  `,
})
class Host {
  readonly rows = CITIES;
  readonly columns = COLUMNS;
  readonly features: readonly AdaptTableFeature[] = [];
  readonly rowKey = (row: City) => row.id;
  readonly defaults = signal({ limit: 2 });
  readonly paginationMode = signal<PaginationMode>("paged");
  readonly urlKey = signal("table");
  readonly urlSync = signal(true);
  readonly mobile = signal(false);
  readonly notified = vi.fn<TableQueryHandler>();
}

async function mount(
  adapter: UrlStateAdapter,
  mobile: boolean,
  configure?: (host: Host) => void
) {
  TestBed.configureTestingModule({
    providers: [{ provide: ADAPTTABLE_URL_ADAPTER, useValue: adapter }],
  });
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  host.mobile.set(mobile);
  configure?.(host);
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  fixture.autoDetectChanges();
  const settle = async () => {
    await fixture.whenStable();
    await Promise.resolve();
    await fixture.whenStable();
  };
  await settle();
  const part = <T extends HTMLElement = HTMLElement>(name: string) =>
    element.querySelector<T>(
      `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
    );
  const names = () =>
    [
      ...element.querySelectorAll(
        `:is([data-adapttable-part="${mobile ? "card-value" : "row"}"], [data-taiga-part="${mobile ? "card-value" : "row"}"])`
      ),
    ].map((row) => row.textContent?.trim());
  return { fixture, host, element, settle, part, names };
}

/** Observe the public backend subscription contract, including teardown. */
function observedAdapter(search: string) {
  const adapter = createMemoryAdapter(search);
  const subscribe = adapter.subscribe;
  const listeners = new Set<() => void>();
  vi.spyOn(adapter, "subscribe").mockImplementation((listener) => {
    listeners.add(listener);
    const unsubscribe = subscribe(listener);
    return () => {
      listeners.delete(listener);
      unsubscribe();
    };
  });
  return { adapter, listeners };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe.each([
  { layout: "desktop rows", mobile: false },
  { layout: "mobile cards", mobile: true },
])("the unstyled table's live query inputs in $layout", ({ mobile }) => {
  it("adopts a changed default limit until the reader chooses a page size", async () => {
    const adapter = createMemoryAdapter("foreign=kept");
    const { host, part, names, settle } = await mount(adapter, mobile);
    expect(names()).toEqual(["City 01", "City 02"]);

    host.defaults.set({ limit: 3 });
    await settle();
    expect(names()).toEqual(["City 01", "City 02", "City 03"]);
    expect(part<HTMLSelectElement>("rows-per-page")?.value).toBe("3");
    expect(adapter.getSearch()).toBe("foreign=kept");

    const select = part<HTMLSelectElement>("rows-per-page")!;
    select.value = "10";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    expect(names()).toEqual(CITIES.slice(0, 10).map((city) => city.name));
    expect(host.notified.mock.calls.at(-1)?.[0]).toMatchObject({
      page: 1,
      limit: 10,
    });
    const chosen = new URLSearchParams(adapter.getSearch());
    expect(chosen.get("table.limit")).toBe("10");
    expect(chosen.get("foreign")).toBe("kept");

    host.defaults.set({ limit: 1 });
    await settle();
    expect(names()).toEqual(CITIES.slice(0, 10).map((city) => city.name));
    expect(part<HTMLSelectElement>("rows-per-page")?.value).toBe("10");
    expect(new URLSearchParams(adapter.getSearch()).get("table.limit")).toBe(
      "10"
    );
  });

  it("switches paged and infinite windows while retaining search, sort and page", async () => {
    const initial =
      "table.q=City&table.sortBy=name&table.sortDir=desc&table.page=2&table.limit=2&foreign=kept";
    const adapter = createMemoryAdapter(initial);
    const { host, part, names, settle } = await mount(adapter, mobile);
    expect(names()).toEqual(["City 10", "City 09"]);
    expect(part("pager")?.textContent).toContain("Page 2 of 6");
    expect(part("load-more-button")).toBeNull();

    host.paginationMode.set("infinite");
    await settle();
    expect(names()).toEqual(["City 12", "City 11", "City 10", "City 09"]);
    expect(part("pager")).toBeNull();
    expect(adapter.getSearch()).toBe(initial);
    part("load-more-button")!.click();
    await settle();
    expect(names()).toEqual([
      "City 12",
      "City 11",
      "City 10",
      "City 09",
      "City 08",
      "City 07",
    ]);
    expect(host.notified.mock.calls.at(-1)?.[0]).toMatchObject({
      page: 3,
      limit: 2,
      search: "City",
      sortBy: "name",
      sortDir: "desc",
    });

    host.paginationMode.set("paged");
    await settle();
    expect(names()).toEqual(["City 08", "City 07"]);
    expect(part("pager")?.textContent).toContain("Page 3 of 6");
    expect(part("load-more-button")).toBeNull();
    const current = new URLSearchParams(adapter.getSearch());
    expect(current.get("table.page")).toBe("3");
    expect(current.get("table.q")).toBe("City");
    expect(current.get("table.sortBy")).toBe("name");
    expect(current.get("table.sortDir")).toBe("desc");
    expect(current.get("foreign")).toBe("kept");
  });

  it("reads a new namespace and writes there without changing the previous or foreign params", async () => {
    const adapter = createMemoryAdapter(
      "left.q=City%200&left.page=2&left.limit=2&left.custom=kept&right.q=City&right.page=2&right.limit=3&right.sortBy=name&right.sortDir=desc&foreign=kept"
    );
    const { host, element, part, names, settle } = await mount(
      adapter,
      mobile,
      (value) => value.urlKey.set("left")
    );
    const table = element.querySelector("adapt-data-table");
    const before = new URLSearchParams(adapter.getSearch());
    expect(names()).toEqual(["City 03", "City 04"]);
    expect(part<HTMLInputElement>("search")?.value).toBe("City 0");

    host.urlKey.set("right");
    await settle();
    expect(element.querySelector("adapt-data-table")).toBe(table);
    expect(names()).toEqual(["City 09", "City 08", "City 07"]);
    expect(part<HTMLInputElement>("search")?.value).toBe("City");
    expect(part("pager")?.textContent).toContain("Page 2 of 4");
    part("page-next")!.click();
    await settle();
    expect(names()).toEqual(["City 06", "City 05", "City 04"]);
    expect(host.notified.mock.calls.at(-1)?.[0]).toMatchObject({
      page: 3,
      limit: 3,
      search: "City",
      sortBy: "name",
      sortDir: "desc",
    });
    const current = new URLSearchParams(adapter.getSearch());
    expect(current.get("right.page")).toBe("3");
    for (const [key, value] of before) {
      if (!key.startsWith("right.")) expect(current.get(key)).toBe(value);
    }
    expect(current.get("page")).toBeNull();
    expect(current.get("limit")).toBeNull();

    host.urlKey.set("left");
    await settle();
    expect(names()).toEqual(["City 03", "City 04"]);
    expect(part<HTMLInputElement>("search")?.value).toBe("City 0");
    expect(part("pager")?.textContent).toContain("Page 2 of 5");
  });

  it("retains private state across URL reconnects and releases listeners on destroy", async () => {
    const initial =
      "table.q=City&table.sortBy=name&table.sortDir=desc&table.page=3&table.limit=2&foreign=kept";
    const { adapter, listeners } = observedAdapter(initial);
    const { fixture, host, part, names, settle } = await mount(
      adapter,
      mobile,
      (value) => value.urlSync.set(false)
    );
    expect(names()).toEqual(["City 01", "City 02"]);
    part("page-next")!.click();
    await settle();
    expect(names()).toEqual(["City 03", "City 04"]);
    expect(adapter.getSearch()).toBe(initial);
    expect(listeners.size).toBe(0);

    host.urlSync.set(true);
    await settle();
    expect(names()).toEqual(["City 08", "City 07"]);
    expect(listeners.size).toBeGreaterThan(0);
    part("page-next")!.click();
    await settle();
    expect(names()).toEqual(["City 06", "City 05"]);
    expect(new URLSearchParams(adapter.getSearch()).get("table.page")).toBe(
      "4"
    );

    host.urlSync.set(false);
    await settle();
    expect(names()).toEqual(["City 03", "City 04"]);
    expect(listeners.size).toBe(0);
    const navigated =
      "table.q=City&table.sortBy=name&table.sortDir=desc&table.page=2&table.limit=2&foreign=changed";
    adapter.setSearch(navigated);
    await settle();
    expect(names()).toEqual(["City 03", "City 04"]);
    part("page-next")!.click();
    await settle();
    expect(names()).toEqual(["City 05", "City 06"]);
    expect(adapter.getSearch()).toBe(navigated);

    host.urlSync.set(true);
    await settle();
    expect(names()).toEqual(["City 10", "City 09"]);
    adapter.setSearch(navigated.replace("table.page=2", "table.page=3"));
    await settle();
    expect(names()).toEqual(["City 08", "City 07"]);
    expect(host.notified.mock.calls.at(-1)?.[0]).toMatchObject({
      page: 3,
      limit: 2,
      sortDir: "desc",
    });

    fixture.destroy();
    expect(listeners.size).toBe(0);
    host.notified.mockClear();
    adapter.setSearch(navigated.replace("table.page=2", "table.page=4"));
    await Promise.resolve();
    expect(host.notified).not.toHaveBeenCalled();
  });
});
