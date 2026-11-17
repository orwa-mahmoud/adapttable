import { type ColumnDef } from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect } from "vitest";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `structural-parts.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function structuralPartsTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  return collectConformanceTests(({ describe, it }) => {
    /** The structural contract every kit's rendered table carries. */
    const STRUCTURAL_PARTS = [
      "table",
      "thead",
      "tbody",
      "row",
      "header-cell",
      "cell",
      "toolbar",
    ] as const;

    interface Person {
      readonly id: string;
      readonly name: string;
    }

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="data"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
        />
      `,
    })
    class Host {
      readonly data: Person[] = [{ id: "ada", name: "Ada" }];
      readonly columns: ColumnDef<Person>[] = [
        { key: "name", header: "Name", sortable: true },
      ];
      readonly rowKey = (row: Person): string => row.id;
    }

    describe("structural parts", () => {
      it("renders every structural part on the desktop table", async () => {
        const fixture = TestBed.createComponent(Host);
        fixture.autoDetectChanges();
        await fixture.whenStable();
        const root = fixture.nativeElement as HTMLElement;
        const rendered = STRUCTURAL_PARTS.filter(
          (part) => root.querySelector(kitSelector(part)) !== null
        );
        expect(rendered).toEqual([...STRUCTURAL_PARTS]);
      });
    });
  });
}
