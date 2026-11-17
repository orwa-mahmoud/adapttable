import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, vi } from "vitest";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `commandPalette.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function commandPaletteTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { commandPalette } = kit.features;
  return collectConformanceTests(({ describe, it }) => {
    /**
     * The each kit command palette: the toolbar button, the dialog, and a command.
     */

    interface Row {
      id: string;
      name: string;
    }

    const ROWS: Row[] = [{ id: "1", name: "Ada" }];

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="rows"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [forceMobile]="false"
          [features]="features"
          [dir]="dir()"
        />
      `,
    })
    class Host {
      readonly rows = ROWS;
      readonly dir = signal<"ltr" | "rtl">("ltr");
      readonly columns = [
        { key: "name", header: "Name", accessor: (row: Row) => row.name },
      ];
      readonly rowKey = (row: Row) => row.id;
      readonly greeted = vi.fn();
      readonly features = [
        commandPalette({
          button: true,
          commands: [
            {
              key: "greet",
              label: "Greet",
              onSelect: () => {
                this.greeted();
              },
            },
          ],
        }),
      ];
    }

    const part = (name: string) =>
      document.querySelector<HTMLElement>(kitSelector(name));

    describe(`command palette (${kit.name} Angular)`, () => {
      it("reports open requests while a plain controlled false keeps the palette closed", async () => {
        const fixture = TestBed.createComponent(Host);
        const onOpenChange = vi.fn();
        fixture.componentInstance.features[0] = commandPalette({
          button: true,
          open: false,
          onOpenChange,
        });
        document.body.append(fixture.nativeElement);
        fixture.autoDetectChanges();
        await fixture.whenStable();
        const trigger = part("command-palette-button")!;
        trigger.click();
        await fixture.whenStable();
        expect(onOpenChange.mock.calls).toEqual([[true]]);
        expect(part("command-palette")).toBeNull();
        expect(trigger.getAttribute("aria-expanded")).toBe("false");
        fixture.destroy();
      });
    });
  });
}
