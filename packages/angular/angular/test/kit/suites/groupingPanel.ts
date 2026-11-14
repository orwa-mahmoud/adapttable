import { type ColumnDef } from "@adapttable/angular";
import {
  type GroupingPanelSlotProps,
  type GroupingPanelState,
  resolveLabels,
} from "@adapttable/angular/adapter";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { expect } from "vitest";

import { type AngularKitUnderTest, kitComponent } from "../kit";

/**
 * The shared `groupingPanel.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function groupingPanelTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { kitSelector } = kit;
  const AdaptGroupingPanel = kitComponent(kit, "AdaptGroupingPanel");
  return collectConformanceTests(({ describe, it }) => {
    interface Row {
      id: string;
      team: string;
      budget: number;
    }

    const COLUMNS: ColumnDef<Row>[] = [
      { key: "team", header: "Team" },
      { key: "budget", header: "Budget" },
    ];

    function state(
      overrides: Partial<GroupingPanelState> = {}
    ): GroupingPanelState {
      return {
        groupBy: ["team"],
        aggregateOverrides: {},
        canSetAggregates: true,
        announcement: "Grouped by Team",
        headerDragProps: () => ({}),
        chipDragProps: () => ({ draggable: true }),
        chipKeyboardProps: (_key, label) => ({
          tabIndex: 0,
          role: "button",
          "aria-label": `Move ${label}`,
          onKeyDown: () => undefined,
        }),
        dropProps: () => ({}),
        removeDropProps: () => ({
          onDragEnter: () => undefined,
          onDragOver: () => undefined,
          onDragLeave: () => undefined,
          onDrop: () => undefined,
        }),
        add: () => undefined,
        remove: () => undefined,
        moveBy: () => undefined,
        setAggregate: () => undefined,
        aggregations: {
          items: [
            {
              columnKey: "budget",
              operationId: "sum",
              editable: true,
              origin: "reader",
              operations: [{ id: "sum", builtIn: true }],
            },
          ],
          candidates: [
            { columnKey: "budget", active: false, operations: [] },
            { columnKey: "team", active: true, operations: [] },
          ],
          atDefaults: false,
          hasDefaults: true,
        },
        setAggregateOperation: () => undefined,
        addAggregate: () => undefined,
        removeAggregate: () => undefined,
        restoreAggregateDefaults: () => undefined,
        ...overrides,
      };
    }

    @Component({
      imports: [AdaptGroupingPanel],
      template: `<adapt-grouping-panel [props]="panel()" />`,
    })
    class Host {
      readonly added: string[] = [];
      readonly removed: string[] = [];
      readonly moved: string[] = [];
      readonly ungrouped: string[] = [];
      readonly panel = signal<GroupingPanelSlotProps<ColumnDef<Row>>>({
        state: state({
          add: (key) => {
            this.added.push(key);
          },
          remove: (key) => {
            this.removed.push(key);
          },
          addAggregate: (key) => {
            this.added.push(`agg:${key}`);
          },
          chipKeyboardProps: (key, label) => ({
            tabIndex: 0,
            role: "button",
            "aria-label": `Move ${label}`,
            onKeyDown: (event) => {
              this.moved.push(`${key}:${event.key}`);
            },
          }),
          removeDropProps: () => ({
            onDrop: () => {
              this.ungrouped.push("drop");
            },
          }),
          drag: { key: "team", source: "chip", overRemove: true },
        }),
        columns: COLUMNS,
        labels: resolveLabels(undefined),
        mobile: false,
      });
    }

    async function mountPanel() {
      const fixture = TestBed.createComponent(Host);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      return {
        element: fixture.nativeElement as HTMLElement,
        host: fixture.componentInstance,
      };
    }

    function one<T extends HTMLElement = HTMLElement>(
      root: HTMLElement,
      name: string
    ): T {
      const found = root.querySelectorAll<T>(kitSelector(name));
      expect(found, name).toHaveLength(1);
      return found[0]!;
    }

    describe("AdaptGroupingPanel", () => {
      it("removes a field from its chip", async () => {
        const { element, host } = await mountPanel();
        one<HTMLButtonElement>(element, "grouping-chip-remove").click();
        expect(host.removed).toEqual(["team"]);
      });

      it("numbers each chip by its grouping level", async () => {
        const { element } = await mountPanel();
        expect(one(element, "grouping-chip-handle").textContent).toContain(
          "1. Team"
        );
      });

      it("hands chip keys to the keyboard mover", async () => {
        const { element, host } = await mountPanel();
        const handle = one(element, "grouping-chip-handle");
        expect(handle.getAttribute("aria-label")).toBe("Move Team");
        handle.dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
        );
        expect(host.moved).toEqual(["team:ArrowRight"]);
      });

      it("ungroups a chip dropped on the remove target", async () => {
        const { element, host } = await mountPanel();
        const zone = one(element, "grouping-remove-zone");
        expect(zone.getAttribute("data-active")).toBe("true");
        zone.dispatchEvent(
          new Event("drop", { bubbles: true, cancelable: true })
        );
        expect(host.ungrouped).toEqual(["drop"]);
      });
    });
  });
}
