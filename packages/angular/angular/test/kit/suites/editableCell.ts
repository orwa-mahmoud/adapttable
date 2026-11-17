import {
  type AdaptTableFeature,
  type CellEditHandler,
  type ColumnDef,
} from "@adapttable/angular";
import { type EditableCellEditorCtrl } from "@adapttable/angular/adapter";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect, vi } from "vitest";

import { type AngularKitUnderTest, kitComponent } from "../kit";

/**
 * The shared `editableCell.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function editableCellTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { editing } = kit.features;
  return collectConformanceTests(({ describe, it, afterEach }) => {
    /**
     * Kit editable cell: focus, select options, and parsed value types.
     */

    interface Shift {
      id: string;
      name: string;
      approved: boolean;
      day: string;
      age: number;
      team: string;
    }

    const ROW: Shift = {
      id: "1",
      name: "Ada",
      approved: false,
      day: "2026-08-13",
      age: 36,
      team: "web",
    };

    const COLUMNS: ColumnDef<Shift>[] = [
      { key: "name", accessor: (row) => row.name, editable: true },
      {
        key: "approved",
        accessor: (row) => row.approved,
        editable: true,
        editor: "boolean",
      },
      {
        key: "day",
        accessor: (row) => row.day,
        editable: true,
        editor: "date",
      },
      {
        key: "age",
        accessor: (row) => row.age,
        editable: true,
        editor: "number",
      },
      {
        key: "team",
        accessor: (row) => row.team,
        editable: true,
        editor: {
          type: "select",
          options: [
            { value: "core", label: "Core" },
            { value: "web", label: "Web" },
          ],
        },
      },
    ];

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="[row]"
          [columns]="columns"
          [rowKey]="rowKey"
          [features]="features()"
          [urlSync]="false"
        />
      `,
    })
    class Host {
      readonly row = ROW;
      readonly columns = COLUMNS;
      readonly rowKey = (row: Shift) => row.id;
      readonly features = input<readonly AdaptTableFeature[]>([]);
    }

    function part(name: string): HTMLElement | null {
      return document.querySelector(kitSelector(name));
    }

    function activates(): HTMLElement[] {
      return [
        ...document.querySelectorAll<HTMLElement>(
          kitSelector("edit-cell-activate")
        ),
      ];
    }

    function editor(): HTMLElement | null {
      return part("edit-cell-editor");
    }

    async function mount(onCellEdit: CellEditHandler<Shift>) {
      const fixture = TestBed.createComponent(Host);
      fixture.componentRef.setInput("features", [editing(onCellEdit)]);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      document.body.append(fixture.nativeElement as HTMLElement);
      return {
        fixture,
        settle: async () => {
          fixture.detectChanges();
          await fixture.whenStable();
        },
      };
    }

    afterEach(() => {
      document.body.replaceChildren();
    });

    describe("AdaptEditableCell", () => {
      it("keeps arrow keys on the editor so caret moves without grid focus", async () => {
        const onCellEdit = vi.fn();
        const { settle } = await mount(onCellEdit as CellEditHandler<Shift>);
        activates()[0]!.dispatchEvent(
          new MouseEvent("dblclick", { bubbles: true })
        );
        await settle();
        const input = editor() as HTMLInputElement;
        expect(input).not.toBeNull();
        input.focus();
        input.setSelectionRange(1, 1);
        const arrow = new KeyboardEvent("keydown", {
          key: "ArrowLeft",
          bubbles: true,
          cancelable: true,
        });
        const stopped = vi.spyOn(arrow, "stopPropagation");
        input.dispatchEvent(arrow);
        expect(stopped).toHaveBeenCalled();
        expect(document.activeElement).toBe(input);
        expect(onCellEdit).not.toHaveBeenCalled();
      });

      it("hands the host the date string for a date editor", async () => {
        const onCellEdit = vi.fn();
        const { settle } = await mount(onCellEdit as CellEditHandler<Shift>);
        activates()[2]!.dispatchEvent(
          new MouseEvent("dblclick", { bubbles: true })
        );
        await settle();
        const input = editor() as HTMLInputElement;
        expect(input.type).toBe("date");
        expect(input.value).toBe("2026-08-13");
        input.value = "2026-09-01";
        input.dispatchEvent(new Event("input"));
        input.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        );
        await settle();
        expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
          ROW,
          "day",
          "2026-09-01"
        );
      });
    });

    // Only a kit that ships the native editor runs its validation tests;
    // a kit with its own editor proves its validation in its own tests.
    if (kit.components?.AdaptNativeCellEditor) {
      describe("AdaptNativeCellEditor validation attributes", () => {
        const AdaptNativeCellEditor = kitComponent(
          kit,
          "AdaptNativeCellEditor"
        );
        const choices = [
          { value: "core", label: "Core" },
          { value: "web", label: "Web" },
        ];
        const kinds: EditableCellEditorCtrl["editor"][] = [
          "text",
          "number",
          "date",
          "boolean",
          { type: "select", options: choices },
          { type: "multi-select", options: choices },
        ];

        it.each(kinds)(
          "reflects and clears busy and conflict state for %j",
          async (kind) => {
            const fixture = TestBed.createComponent(AdaptNativeCellEditor);
            const props: EditableCellEditorCtrl = {
              editor: kind,
              draft: "",
              setDraft: vi.fn(),
              onEditorKeyDown: vi.fn(),
              commitOnBlur: vi.fn(),
              selectOptions: choices,
              label: "Edit team",
              error: "Value changed",
              errorId: "team-error",
              validating: true,
              conflict: true,
              focusRef: vi.fn(),
            };
            fixture.componentRef.setInput("props", props);
            document.body.append(fixture.nativeElement as HTMLElement);
            fixture.autoDetectChanges();
            await fixture.whenStable();
            const field = editor();
            expect(field).not.toBeNull();
            expect(field!.getAttribute("aria-busy")).toBe("true");
            expect(field!.getAttribute("data-conflict")).toBe("");
            expect(field!.getAttribute("aria-invalid")).toBe("true");
            expect(field!.getAttribute("aria-describedby")).toBe("team-error");

            fixture.componentRef.setInput("props", {
              ...props,
              error: undefined,
              validating: false,
              conflict: false,
            });
            await fixture.whenStable();
            expect(field!.hasAttribute("aria-busy")).toBe(false);
            expect(field!.hasAttribute("data-conflict")).toBe(false);
            expect(field!.hasAttribute("aria-invalid")).toBe(false);
            expect(field!.hasAttribute("aria-describedby")).toBe(false);
          }
        );
      });
    }
  });
}
