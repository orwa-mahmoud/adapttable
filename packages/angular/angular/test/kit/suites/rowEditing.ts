import { type AdaptTableFeature, type ColumnDef } from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, vi } from "vitest";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `rowEditing.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function rowEditingTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { rowActions, rowEditing } = kit.features;
  return collectConformanceTests(({ describe, it, afterEach }) => {
    /**
     * Row editing through the each kit table — one patch per save, on desktop
     * rows and phone cards.
     */

    interface Task {
      id: string;
      title: string;
      points: number;
    }

    const ROWS: Task[] = [
      { id: "1", title: "Ship", points: 3 },
      { id: "2", title: "Test", points: 5 },
    ];

    const COLS: ColumnDef<Task>[] = [
      {
        key: "title",
        header: "Title",
        accessor: (r) => r.title,
        editable: true,
      },
      {
        key: "points",
        header: "Points",
        accessor: (r) => r.points,
        editable: true,
        editor: "number",
      },
    ];

    function all(name: string): HTMLElement[] {
      return [...document.querySelectorAll<HTMLElement>(kitSelector(name))];
    }

    function one(name: string): HTMLElement {
      const found = all(name);
      expect(found, name).toHaveLength(1);
      return found[0]!;
    }

    function editors(): HTMLInputElement[] {
      return all("edit-cell-editor") as HTMLInputElement[];
    }

    function type(field: HTMLInputElement, value: string): void {
      field.value = value;
      field.dispatchEvent(new Event("input"));
    }

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="data"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [forceMobile]="mobile()"
          [features]="features()"
        />
      `,
    })
    class Host {
      readonly features = input<readonly AdaptTableFeature[]>([]);
      readonly mobile = input<boolean | undefined>(undefined);
      readonly data = ROWS;
      readonly columns = COLS;
      readonly rowKey = (row: Task) => row.id;
    }

    async function mount(
      features: readonly AdaptTableFeature[],
      mobile?: boolean
    ) {
      const fixture = TestBed.createComponent(Host);
      fixture.componentRef.setInput("features", features);
      fixture.componentRef.setInput("mobile", mobile);
      document.body.append(fixture.nativeElement as HTMLElement);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      return () => fixture.whenStable();
    }

    afterEach(() => {
      document.body.replaceChildren();
    });

    describe(`row editing (${kit.name} Angular)`, () => {
      it("opens every editable field of the row and focuses the first", async () => {
        const settle = await mount([rowEditing(vi.fn())]);
        all("row-edit-begin")[0]!.click();
        await settle();
        expect(editors().map((field) => field.value)).toEqual(["Ship", "3"]);
        expect(document.activeElement).toBe(editors()[0]);
        expect(all("row-edit-begin")).toHaveLength(1);
        expect(one("row-edit-save").getAttribute("aria-label")).toBe(
          "Save row"
        );
        expect(one("row-edit-cancel").getAttribute("aria-label")).toBe(
          "Cancel"
        );
      });

      it("throws the drafts away on cancel", async () => {
        const onRowEdit = vi.fn();
        const settle = await mount([rowEditing(onRowEdit)]);
        all("row-edit-begin")[0]!.click();
        await settle();
        type(editors()[0]!, "Ship it");
        await settle();
        one("row-edit-cancel").click();
        await settle();
        expect(onRowEdit).not.toHaveBeenCalled();
        expect(editors()).toHaveLength(0);

        all("row-edit-begin")[0]!.click();
        await settle();
        expect(editors()[0]!.value).toBe("Ship");
      });

      it("draws the label as text when the host turns the glyph off", async () => {
        await mount([rowEditing(vi.fn(), { rowEditIcons: { begin: false } })]);
        const begin = all("row-edit-begin")[0]!;
        expect(begin.querySelector("svg")).toBeNull();
        expect(begin.textContent.trim()).toBe("Edit row");
        expect(begin.hasAttribute("title")).toBe(false);
      });

      it("lets a host action that opens the row replace the begin control", async () => {
        const onRowEdit = vi.fn();
        const settle = await mount([
          rowEditing(onRowEdit),
          rowActions<Task>([{ key: "edit", label: "Change", editsRow: true }]),
        ]);
        expect(all("row-edit-begin")).toHaveLength(0);
        const change = [...document.querySelectorAll("button")].filter(
          (button) => button.textContent.trim() === "Change"
        );
        expect(change).toHaveLength(2);
        change[1]!.click();
        await settle();
        expect(editors().map((field) => field.value)).toEqual(["Test", "5"]);
        type(editors()[0]!, "Tested");
        await settle();
        one("row-edit-save").click();
        await settle();
        expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(ROWS[1], {
          title: "Tested",
        });
      });

      it("edits a row from its phone card", async () => {
        const onRowEdit = vi.fn();
        const settle = await mount([rowEditing(onRowEdit)], true);
        expect(all("card")).toHaveLength(2);
        const begin = all("card")[0]!.querySelector<HTMLElement>(
          kitSelector("row-edit-begin")
        );
        expect(begin).not.toBeNull();
        begin!.click();
        await settle();
        type(editors()[0]!, "Ship it");
        await settle();
        one("row-edit-save").click();
        await settle();
        expect(onRowEdit).toHaveBeenCalledExactlyOnceWith(ROWS[0], {
          title: "Ship it",
        });
      });

      it("draws no row controls without the feature", async () => {
        await mount([]);
        expect(all("row-edit-begin")).toHaveLength(0);
        expect(all("actions-header")).toHaveLength(0);
      });
    });
  });
}
