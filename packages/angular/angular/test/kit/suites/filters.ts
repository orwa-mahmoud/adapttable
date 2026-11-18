import {
  type ColumnDef,
  type FilterDef,
  type FilterTypeSpec,
  type TableLabels,
} from "@adapttable/angular";
import {
  defaultFilterRegistry,
  type FiltersMode,
  type FilterWidgetRenderProps,
} from "@adapttable/angular/adapter";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, input, type TemplateRef, viewChild } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { type AngularKitUnderTest } from "../kit";

/**
 * The shared `filters.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function filtersTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { filterTypes, filters, headerFilters } = kit.features;
  return collectConformanceTests(({ describe, it, afterEach }) => {
    interface Person {
      id: string;
      name: string;
      city: string;
      age: number;
      active: boolean;
      joined: string;
      team: string;
    }

    const PEOPLE: Person[] = [
      {
        id: "1",
        name: "Ada",
        city: "Dubai",
        age: 36,
        active: true,
        joined: "2020-01-10",
        team: "a",
      },
      {
        id: "2",
        name: "Grace",
        city: "Amman",
        age: 28,
        active: false,
        joined: "2021-06-01",
        team: "b",
      },
      {
        id: "3",
        name: "Linus",
        city: "Dubai",
        age: 54,
        active: true,
        joined: "2019-03-15",
        team: "b",
      },
    ];

    const COLUMNS: ColumnDef<Person>[] = [
      { key: "name", accessor: (row) => row.name },
      { key: "city", accessor: (row) => row.city },
      { key: "age", accessor: (row) => row.age },
    ];

    const DEFS: FilterDef<Person>[] = [
      { key: "name", type: "text" },
      {
        key: "city",
        type: "select",
        options: [
          { value: "Dubai", label: "Dubai" },
          { value: "Amman", label: "Amman" },
        ],
      },
      { key: "age", type: "numberRange" },
      { key: "active", type: "boolean" },
      { key: "joined", type: "dateRange" },
      {
        key: "team",
        type: "multiSelect",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
    ];

    @Component({
      imports: [AdaptDataTable],
      template: `
        <ng-template #custom let-props let-source="source" let-labels="labels">
          <input
            data-custom-filter
            [attr.aria-label]="props.def.label"
            [placeholder]="labels.search"
            [value]="source.extra[props.def.key] ?? ''"
            (input)="source.setExtra(props.def.key, $any($event.target).value)"
          />
        </ng-template>
        <adapt-data-table
          [data]="data"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [forceMobile]="false"
          [features]="features()"
          [filtersMode]="mode()"
          [filterFields]="fields()"
          [labels]="labels()"
        />
      `,
    })
    class Host {
      readonly features = input([filters(DEFS)]);
      readonly mode = input<FiltersMode>("popover");
      readonly fields = input(true);
      readonly labels = input<Partial<TableLabels> | undefined>(undefined);
      readonly custom =
        viewChild.required<TemplateRef<FilterWidgetRenderProps<Person>>>(
          "custom"
        );
      readonly data = PEOPLE;
      readonly columns = COLUMNS;
      readonly rowKey = (row: Person) => row.id;
    }

    async function mount(
      features = [filters(DEFS)],
      mode: FiltersMode = "popover",
      fields = true
    ) {
      const fixture = TestBed.createComponent(Host);
      fixture.componentRef.setInput("features", features);
      fixture.componentRef.setInput("mode", mode);
      fixture.componentRef.setInput("fields", fields);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      document.body.append(element);
      // The table first, then the document, where an overlay renders.
      const part = <T extends HTMLElement>(
        name: string,
        root: ParentNode = element
      ) =>
        root.querySelector<T>(kitSelector(name)) ??
        (root === element
          ? document.querySelector<T>(kitSelector(name))
          : null);
      const parts = <T extends HTMLElement>(
        name: string,
        root: ParentNode = element
      ) => {
        const local = [...root.querySelectorAll<T>(kitSelector(name))];
        return local.length > 0 || root !== element
          ? local
          : [...document.querySelectorAll<T>(kitSelector(name))];
      };
      const ids = () => parts("row").map((row) => row.dataset.rowId);
      const settle = () => fixture.whenStable();
      const field = (caption: string) =>
        parts("filter-field").find(
          (candidate) =>
            part("filter-label", candidate)?.textContent?.trim() === caption
        );
      const type = async (
        control: Element | null | undefined,
        value: string
      ) => {
        if (!control) throw new Error("target is not rendered");
        if (await kit.chooseOption?.(fixture, control, value)) return;
        const target =
          control instanceof HTMLInputElement ||
          control instanceof HTMLSelectElement
            ? control
            : control.querySelector<HTMLInputElement | HTMLSelectElement>(
                "input, select"
              );
        if (!target) throw new Error("input is not rendered");
        target.value = value;
        target.dispatchEvent(
          new Event(target instanceof HTMLSelectElement ? "change" : "input", {
            bubbles: true,
          })
        );
        await settle();
      };
      const openFilters = async () => {
        part<HTMLButtonElement>("filters-button")!.click();
        await settle();
      };
      return {
        fixture,
        element,
        part,
        parts,
        ids,
        settle,
        field,
        type,
        openFilters,
      };
    }

    afterEach(() => {
      document.body.innerHTML = "";
    });

    describe(`the ${kit.name} Angular filters`, () => {
      it("changes a text filter's operator", async () => {
        const { part, ids, field, type, openFilters } = await mount();
        await openFilters();
        await type(part("filter-input", field("Name")), "a");
        await type(part("filter-operator", field("Name")), "startsWith");
        expect(ids()).toEqual(["1"]);
      });

      it("holds the per-field form beside the AND/OR tree by default", async () => {
        const { part, field, openFilters } = await mount();
        await openFilters();
        expect(field("Name")).toBeDefined();
        expect(part("filter-tree")).not.toBeNull();
      });

      it("keeps only the AND/OR tree when the per-field form is off", async () => {
        const { part, parts, openFilters } = await mount(
          [filters(DEFS)],
          "popover",
          false
        );
        await openFilters();
        expect(parts("filter-field")).toHaveLength(0);
        expect(part("filter-tree")).not.toBeNull();
      });

      it("offers header funnels without the Filters button", async () => {
        const { element, part, parts } = await mount([
          filters(),
          headerFilters(),
        ]);
        expect(part("filters-button")).not.toBeNull();
        // The shared part name, beside any part name the kit keeps for itself.
        expect(
          element.querySelector('[data-adapttable-part="filters-button"]')
        ).toBe(part("filters-button"));
        const headerOnly = await mount([headerFilters()]);
        expect(headerOnly.part("filters-button")).toBeNull();
        expect(parts("filter-header-trigger")).toHaveLength(0);
      });

      it("draws each field with the widget composed for its kind", async () => {
        const composed = kit.features.filtersWith([
          kit.features.textFilterWidget,
          kit.features.rangeFilterWidget,
        ]);
        const { parts, openFilters } = await mount([
          composed<Person>([
            { key: "name", type: "text" },
            { key: "age", type: "numberRange" },
          ]),
        ]);
        await openFilters();
        expect(parts("filter-field")).toHaveLength(2);
        expect(parts("filter-operator")).toHaveLength(2);
      });

      it("says nothing matched when a filter leaves no rows", async () => {
        const { part, field, type, openFilters } = await mount();
        await openFilters();
        await type(part("filter-input", field("Name")), "nobody");
        expect(part("empty")?.textContent).toContain("No results");
      });
    });

    function customSpec(render: FilterTypeSpec["render"]): FilterTypeSpec {
      return { ...defaultFilterRegistry.get("text")!, type: "custom", render };
    }

    const CUSTOM_DEFS: readonly FilterDef<Person>[] = [
      { key: "name", type: "custom", label: "Person" },
    ];

    describe("registered Angular form renderers", () => {
      it.each([
        { value: "Custom caption", text: "Custom caption" },
        { value: 7, text: "7" },
        { value: undefined, text: null },
        { value: 0, text: null },
        { value: {}, text: null },
      ])(
        "renders text or uses the kit widget for $value",
        async ({ value, text }) => {
          const { part, openFilters } = await mount([
            filters(CUSTOM_DEFS),
            filterTypes([
              customSpec(value === undefined ? undefined : () => value),
            ]),
          ]);
          await openFilters();
          if (text) {
            expect(part("filters-form")?.textContent).toContain(text);
            expect(part("filter-input")).toBeNull();
          } else {
            expect(part("filter-input")).not.toBeNull();
            expect(part("filters-form")?.textContent).not.toContain(
              "[object Object]"
            );
          }
        }
      );
    });
  });
}
