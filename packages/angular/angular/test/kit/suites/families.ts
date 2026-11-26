import { type AdaptTableFeature, type ColumnDef } from "@adapttable/angular";
import { type FeatureListEntry } from "@adapttable/angular/adapter";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, vi } from "vitest";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `families.test.ts` suite: behaviour every Angular kit shows.
 *
 * A family is every member of an area, built by one call and passed to
 * `features` as one entry. Each test reads the members' own controls, so a
 * family that dropped a member, or one the table did not unfold, fails here.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function familiesTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { editingFamily, filteringFamily, columnLayoutFamily } = kit.features;
  return collectConformanceTests(({ describe, it, afterEach }) => {
    interface Row {
      id: string;
      name: string;
      team: string;
    }
    const ROWS: Row[] = [
      { id: "1", name: "Ada", team: "Core" },
      { id: "2", name: "Grace", team: "Web" },
    ];
    const COLUMNS: ColumnDef<Row>[] = [
      {
        key: "name",
        header: "Name",
        accessor: (row) => row.name,
        editable: true,
      },
      { key: "team", header: "Team", accessor: (row) => row.team },
    ];

    @Component({
      imports: [AdaptDataTable],
      template: `<adapt-data-table
        [data]="rows"
        [columns]="columns"
        [rowKey]="rowKey"
        [features]="features()"
        [urlSync]="false"
        [forceMobile]="false"
      />`,
    })
    class FamilyHost {
      readonly features = input<readonly FeatureListEntry<AdaptTableFeature>[]>(
        []
      );
      readonly rows = ROWS;
      readonly columns = COLUMNS;
      readonly rowKey = (row: Row) => row.id;
    }

    const all = (name: string) => [
      ...document.querySelectorAll<HTMLElement>(kitSelector(name)),
    ];

    async function mount(
      features: readonly FeatureListEntry<AdaptTableFeature>[]
    ) {
      const fixture = TestBed.createComponent(FamilyHost);
      fixture.componentRef.setInput("features", features);
      document.body.append(fixture.nativeElement as HTMLElement);
      fixture.autoDetectChanges();
      const settle = async () => {
        await fixture.whenStable();
        await Promise.resolve();
        await fixture.whenStable();
      };
      await settle();
      return settle;
    }

    afterEach(() => {
      document.body.replaceChildren();
    });

    describe(`feature families (${kit.name})`, () => {
      it("editingFamily edits a cell, marks it until the host confirms, and offers undo", async () => {
        const save = vi.fn(() => new Promise<void>(() => undefined));
        const settle = await mount([editingFamily<Row>(save)]);

        expect(all("undo-button")).not.toHaveLength(0);
        all("edit-cell-activate")[0]!.dispatchEvent(
          new MouseEvent("dblclick", { bubbles: true })
        );
        await settle();
        const editor = all("edit-cell-editor")[0] as HTMLInputElement;
        editor.value = "Augusta";
        editor.dispatchEvent(new Event("input"));
        editor.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        );
        await settle();

        expect(save).toHaveBeenCalledWith(ROWS[0], "name", "Augusta");
        expect(document.querySelector("[data-dirty]")).not.toBeNull();
      });

      it("filteringFamily draws the filter panel trigger and the header filter triggers", async () => {
        await mount([
          filteringFamily<Row>([
            {
              key: "team",
              type: "select",
              options: [
                { value: "Core", label: "Core" },
                { value: "Web", label: "Web" },
              ],
            },
          ]),
        ]);

        expect(all("filters-button")).not.toHaveLength(0);
        expect(all("filter-header-trigger")).not.toHaveLength(0);
      });

      it("columnLayoutFamily draws the columns menu and resize handles", async () => {
        await mount([columnLayoutFamily()]);

        expect(all("column-menu-button")).not.toHaveLength(0);
        expect(all("resize-handle")).not.toHaveLength(0);
      });

      it("composes two families in one list", async () => {
        await mount([columnLayoutFamily(), editingFamily<Row>(vi.fn())]);

        expect(all("column-menu-button")).not.toHaveLength(0);
        expect(all("undo-button")).not.toHaveLength(0);
        expect(all("edit-cell-activate")).not.toHaveLength(0);
      });
    });
  });
}
