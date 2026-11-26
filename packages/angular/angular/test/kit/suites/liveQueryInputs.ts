import {
  ADAPTTABLE_URL_ADAPTER,
  type AdaptTableFeature,
  type ColumnDef,
  createMemoryAdapter,
  type PaginationMode,
  type TableQueryHandler,
  type UrlStateAdapter,
} from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, vi } from "vitest";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `liveQueryInputs.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function liveQueryInputsTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  return collectConformanceTests(({ describe, it, afterEach }) => {
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
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [features]="features"
          [defaults]="defaults()"
          [paginationMode]="paginationMode()"
          [urlKey]="urlKey()"
          [urlSync]="urlSync()"
          [forceMobile]="mobile()"
          [onViewChange]="notified"
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
        element.querySelector<T>(kitSelector(name));
      const names = () =>
        [
          ...element.querySelectorAll(
            kitSelector(mobile ? "card-value" : "row")
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
    ])(`the ${kit.name} table's live query inputs in $layout`, ({ mobile }) => {
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
  });
}
