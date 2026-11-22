import {
  applyRowPatches,
  type CellEditHandler,
  type ColumnDef,
  rekeyRow,
  type RowPinState,
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
 * The shared `rowRekey.test.ts` suite: a rekey moves what the table keeps by
 * row id in every Angular kit.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function rowRekeyTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { cellNavigation, editing, rowPinning } = kit.features;
  return collectConformanceTests(({ describe, it, afterEach }) => {
    interface Person {
      readonly id: string;
      readonly name: string;
    }

    const PEOPLE: readonly Person[] = [
      { id: "1", name: "Ada" },
      { id: "2", name: "Grace" },
    ];
    const rowKey = (row: Person): string => row.id;
    const COLUMNS: ColumnDef<Person>[] = [
      { key: "name", accessor: (row) => row.name, editable: true },
    ];
    const rekeyed = applyRowPatches(
      PEOPLE,
      [rekeyRow<Person>("1", { id: "1b" })],
      rowKey
    );

    let onCellEdit: CellEditHandler<Person> | undefined;

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [selectable]="true"
          [selectedIds]="selectedIds()"
          (selectionChange)="onSelectionChange($event)"
          [features]="features"
        />
      `,
    })
    class Host {
      readonly rows = signal<readonly Person[]>(PEOPLE);
      readonly columns = COLUMNS;
      readonly rowKey = rowKey;
      readonly selectedIds = signal<readonly string[]>(["1"]);
      readonly onSelectionChange = vi.fn((ids: string[]) => {
        this.selectedIds.set(ids);
      });
      readonly pinnedRowIds = signal<RowPinState>({ top: ["1"], bottom: [] });
      readonly onPinnedRowIdsChange = vi.fn((next: RowPinState) => {
        this.pinnedRowIds.set(next);
      });
      readonly features = [
        rowPinning({
          pinnedRowIds: this.pinnedRowIds,
          onPinnedRowIdsChange: this.onPinnedRowIdsChange,
        }),
        editing<Person>((row, key, value) => onCellEdit?.(row, key, value)),
      ];
    }

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [features]="features"
        />
      `,
    })
    class GridHost {
      readonly rows = signal<readonly Person[]>(PEOPLE);
      readonly columns = COLUMNS;
      readonly rowKey = rowKey;
      readonly features = [cellNavigation()];
    }

    async function mount() {
      const fixture = TestBed.createComponent(Host);
      document.body.append(fixture.nativeElement as HTMLElement);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      return {
        host: fixture.componentInstance,
        settle: async () => {
          fixture.detectChanges();
          await fixture.whenStable();
        },
      };
    }

    afterEach(() => {
      onCellEdit = undefined;
      document.body.replaceChildren();
    });

    describe("a rekeyed row", () => {
      it("keeps the reader's focus on its cell", async () => {
        const fixture = TestBed.createComponent(GridHost);
        document.body.append(fixture.nativeElement as HTMLElement);
        fixture.autoDetectChanges();
        await fixture.whenStable();
        const cell = (): HTMLElement | null =>
          document.querySelector<HTMLElement>('[data-grid-cell="0:0"]');
        cell()!.focus();
        await fixture.whenStable();
        fixture.componentInstance.rows.set(rekeyed);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(document.activeElement).toBe(cell());
        expect(document.activeElement).not.toBe(document.body);
      });

      it("asks the host to move its selection and its pin", async () => {
        const { host, settle } = await mount();
        host.rows.set(rekeyed);
        await settle();
        expect(host.onSelectionChange).toHaveBeenLastCalledWith(["1b"]);
        expect(host.onPinnedRowIdsChange).toHaveBeenLastCalledWith({
          top: ["1b"],
          bottom: [],
        });
      });

      it("keeps an open editor and its draft, and saves against the new row", async () => {
        const saved = vi.fn();
        onCellEdit = saved as CellEditHandler<Person>;
        const { host, settle } = await mount();
        document
          .querySelector<HTMLElement>(kitSelector("edit-cell-activate"))!
          .dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        await settle();
        const input = document.querySelector<HTMLInputElement>(
          kitSelector("edit-cell-editor")
        )!;
        input.value = "Typed";
        input.dispatchEvent(new Event("input"));
        await settle();
        host.rows.set(rekeyed);
        await settle();
        const kept = document.querySelector<HTMLInputElement>(
          kitSelector("edit-cell-editor")
        );
        expect(kept?.value).toBe("Typed");
        kept!.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        );
        await settle();
        expect(saved).toHaveBeenCalledExactlyOnceWith(
          rekeyed[0],
          "name",
          "Typed"
        );
      });
    });
  });
}
