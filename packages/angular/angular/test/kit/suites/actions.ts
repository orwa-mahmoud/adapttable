import {
  type AdaptTableFeature,
  type ColumnDef,
  type ConfirmHandler,
  type RowAction,
} from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `actions.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function actionsTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const { bulkActions, rowActions } = kit.features;
  return collectConformanceTests(({ describe, it, beforeEach, afterEach }) => {
    interface Person {
      id: string;
      name: string;
    }

    const PEOPLE: Person[] = Array.from({ length: 12 }, (_, index) => ({
      id: String(index + 1),
      name: `Person ${String(index + 1)}`,
    }));

    const COLUMNS: ColumnDef<Person>[] = [
      { key: "name", accessor: (row) => row.name },
    ];

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="data"
          [columns]="columns"
          [rowKey]="rowKey"
          [urlSync]="false"
          [forceMobile]="mobile()"
          [defaults]="{ limit: 5 }"
          [features]="features()"
          [confirm]="confirm"
        />
      `,
    })
    class Host {
      readonly features = input<readonly AdaptTableFeature[]>([]);
      readonly mobile = input(false);
      readonly data = PEOPLE;
      readonly columns = COLUMNS;
      readonly rowKey = (row: Person) => row.id;
      readonly confirm: ConfirmHandler = (request) => {
        request.onConfirm();
      };
    }

    async function mount(
      features: readonly AdaptTableFeature[],
      mobile = false
    ) {
      const fixture = TestBed.createComponent(Host);
      fixture.componentRef.setInput("features", features);
      fixture.componentRef.setInput("mobile", mobile);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      document.body.append(element);
      const part = <T extends HTMLElement>(
        name: string,
        root: ParentNode = document.body
      ) => root.querySelector<T>(kitSelector(name));
      const parts = <T extends HTMLElement>(
        name: string,
        root: ParentNode = document.body
      ) => [...root.querySelectorAll<T>(kitSelector(name))];
      return {
        fixture,
        element,
        part,
        parts,
        settle: () => fixture.whenStable(),
      };
    }

    afterEach(() => {
      document.body.innerHTML = "";
    });

    describe(`the ${kit.name} Angular bulk actions`, () => {
      it("offers every matching row once the page is selected", async () => {
        const seen: unknown[] = [];
        const { part, parts, settle } = await mount([
          bulkActions([
            {
              key: "export",
              label: "Export",
              onClick: (ids, context) => {
                seen.push(ids.length, context);
              },
            },
          ]),
        ]);
        part<HTMLInputElement>("checkbox")!.click();
        await settle();
        expect(part("select-all-text")?.textContent).toContain("5");
        part<HTMLButtonElement>("select-all-button")!.click();
        await settle();
        expect(part("select-all-text")?.textContent).toContain("12");
        parts<HTMLButtonElement>("bulk-button")[0]!.click();
        await settle();
        expect(seen).toEqual([5, { allMatching: true, total: 12 }]);
      });

      it("asks before an action that declares a confirmation", async () => {
        const ran: number[] = [];
        const { part, parts, settle } = await mount([
          bulkActions([
            {
              key: "purge",
              label: "Purge",
              confirm: {
                title: "Purge?",
                message: (count) => `Purge ${String(count)}?`,
                confirmLabel: "Purge",
              },
              onClick: (ids) => {
                ran.push(ids.length);
              },
            },
          ]),
        ]);
        parts<HTMLInputElement>("checkbox")[1]!.click();
        await settle();
        parts<HTMLButtonElement>("bulk-button")[0]!.click();
        await settle();
        expect(ran).toEqual([1]);
        expect(part("bulk-bar")).toBeNull();
      });
    });

    describe(`the ${kit.name} Angular row actions`, () => {
      const edits: string[] = [];
      const actions: RowAction<Person>[] = [
        {
          key: "edit",
          label: "Edit",
          onClick: (row) => {
            edits.push(row.id);
          },
        },
        {
          key: "blocked",
          label: "Blocked",
          disabledReason: (row) => (row.id === "1" ? "Locked" : undefined),
          onClick: () => undefined,
        },
        {
          key: "gone",
          label: "Gone",
          isHidden: () => true,
          onClick: () => undefined,
        },
      ];

      beforeEach(() => {
        edits.length = 0;
      });

      it("adds an actions column with the host's actions, then Duplicate and Delete", async () => {
        const duplicated: string[] = [];
        const deleted: string[] = [];
        const { part, parts, settle } = await mount([
          rowActions(actions, {
            onDuplicateRow: (row) => duplicated.push(row.id),
            onDeleteRow: (row) => deleted.push(row.id),
          }),
        ]);
        expect(part("actions-header")?.textContent?.trim()).toBe("Actions");
        const buttons = parts<HTMLButtonElement>(
          "action-button",
          part("actions-cell") ?? undefined
        );
        expect(buttons.map((button) => button.textContent?.trim())).toEqual([
          "Edit",
          "Blocked",
          "Duplicate row",
          "Delete row",
        ]);
        expect(buttons[1]?.disabled).toBe(true);
        buttons[0]!.click();
        buttons[2]!.click();
        buttons[3]!.click();
        await settle();
        expect(edits).toEqual(["1"]);
        expect(duplicated).toEqual(["1"]);
        expect(deleted).toEqual(["1"]);
      });

      it("puts the actions on each phone card", async () => {
        const { parts } = await mount([rowActions(actions)], true);
        expect(parts("card-actions")).toHaveLength(5);
      });
    });

    describe("host-owned additions", () => {
      it.each([false, true])(
        "adds rows from the toolbar with mobile=%s",
        async (mobile) => {
          const add = vi.fn();
          const { part, settle } = await mount(
            [rowActions([], { onAddRow: add })],
            mobile
          );
          const button = part<HTMLButtonElement>("add-row")!;
          expect(button.textContent?.trim()).toBe("Add row");
          button.click();
          await settle();
          expect(add).toHaveBeenCalledOnce();
        }
      );
    });
  });
}
