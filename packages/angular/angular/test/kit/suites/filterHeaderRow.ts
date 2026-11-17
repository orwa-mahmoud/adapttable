import { type ExtraFilters, type FilterDef } from "@adapttable/angular";
import { defaultLabels } from "@adapttable/angular/adapter";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect } from "vitest";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `filterHeaderRow.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function filterHeaderRowTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { kitSelector } = kit;
  const { AdaptFilterHeaderRow } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    /**
     * Native header-filter controls: the same writes the React kit's header
     * harness covers, drawn through the compact row.
     */

    interface Row {
      name: string;
      team: string;
      tags: string[];
      core: boolean;
      age: number;
      hired: string;
    }

    const DEFS: FilterDef<Row>[] = [
      { key: "name", type: "text", label: "Name" },
      {
        key: "team",
        type: "select",
        label: "Team",
        options: [
          { value: "Core", label: "Core" },
          { value: "Web", label: "Web" },
        ],
      },
      {
        key: "tags",
        type: "multiSelect",
        label: "Tags",
        options: [
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ],
      },
      { key: "core", type: "boolean", label: "Core" },
      { key: "age", type: "numberRange", label: "Age" },
      { key: "hired", type: "dateRange", label: "Hired" },
    ];

    const COLUMNS = [
      { key: "name" },
      { key: "team" },
      { key: "tags" },
      { key: "core" },
      { key: "age" },
      { key: "hired" },
    ];

    function memory(extra: ReturnType<typeof signal<ExtraFilters>>) {
      return {
        get extra() {
          return extra();
        },
        setExtra: (key: string, value: ExtraFilters[string]) => {
          extra.update((prev) => ({ ...prev, [key]: value }));
        },
        setExtras: (patch: ExtraFilters) => {
          extra.update((prev) => ({ ...prev, ...patch }));
        },
        allFilteredRows: [] as Row[],
        facets: {},
      };
    }

    @Component({
      imports: [AdaptFilterHeaderRow],
      template: `
        <table>
          <thead>
            <adapt-filter-header-row
              [enabled]="enabled()"
              [columns]="columns"
              [defs]="defs"
              [source]="source()"
              [labels]="labels"
            />
          </thead>
        </table>
      `,
    })
    class RowHost {
      readonly labels = defaultLabels;
      readonly columns = COLUMNS;
      readonly defs = DEFS;
      readonly enabled = signal(true);
      readonly extra = signal<ExtraFilters>({});
      readonly source = computed(() => memory(this.extra));
    }

    async function mountRow(prepare?: (host: RowHost) => void) {
      const fixture = TestBed.createComponent(RowHost);
      prepare?.(fixture.componentInstance);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      const labeled = (name: string) =>
        [...element.querySelectorAll<HTMLElement>("[aria-label]")].filter(
          (node) => node.getAttribute("aria-label") === name
        );
      return { fixture, element, labeled, host: fixture.componentInstance };
    }

    describe("AdaptFilterHeaderRow", () => {
      it("writes the upper bound of a between pair", async () => {
        const { labeled, fixture } = await mountRow((host) => {
          host.extra.set({ ageOp: "between", ageMin: "10", ageMax: "40" });
        });
        const bounds = labeled("Age") as HTMLInputElement[];
        expect(bounds).toHaveLength(2);
        const upper = bounds[1];
        if (!upper) throw new Error("upper bound is not rendered");
        upper.value = "50";
        upper.dispatchEvent(new Event("input"));
        await fixture.whenStable();
        expect(upper.value).toBe("50");
      });

      it("renders nothing when the row is disabled", async () => {
        const { element, host, fixture } = await mountRow((current) => {
          current.enabled.set(false);
        });
        expect(
          element.querySelector(kitSelector("filter-header-row"))
        ).toBeNull();
        host.enabled.set(true);
        await fixture.whenStable();
        expect(
          element.querySelector(kitSelector("filter-header-row"))
        ).not.toBeNull();
      });
    });
  });
}
