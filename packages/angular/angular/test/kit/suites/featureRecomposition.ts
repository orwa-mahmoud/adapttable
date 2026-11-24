import {
  type AdaptTableFeature,
  type ColumnDef,
  type ColumnLayoutState,
  type ConfirmHandler,
  type FeatureMountContext,
} from "@adapttable/angular";
import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import { Component, computed, signal } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { expect, vi } from "vitest";

import type { AngularKitUnderTest } from "../kit";

/**
 * The shared `featureRecomposition.test.ts` suite: behaviour every Angular kit shows.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function featureRecompositionTests(
  kit: AngularKitUnderTest
): readonly ConformanceTest[] {
  const { Table: AdaptDataTable, kitSelector } = kit;
  const {
    columnMenu,
    densityChooser,
    editing,
    print,
    rowActions,
    tree,
    selection,
  } = kit.features;
  return collectConformanceTests(({ describe, it, afterEach }) => {
    /** Feature identities change while the mounted table and its state stay alive. */

    interface Row {
      id: string;
      name: string;
      team: string;
      reports?: Row[];
    }
    const ROWS: readonly Row[] = [
      { id: "1", name: "Ada", team: "Core" },
      { id: "2", name: "Grace", team: "Research" },
    ];
    const COLUMNS: readonly ColumnDef<Row>[] = [
      {
        key: "name",
        header: "Name",
        accessor: (row) => row.name,
        editable: true,
        sortable: true,
        renameable: true,
      },
      { key: "team", header: "Team", accessor: (row) => row.team },
    ];

    @Component({
      imports: [AdaptDataTable],
      template: `
        <adapt-data-table
          [data]="rows()"
          [columns]="columns"
          [rowKey]="rowKey"
          [features]="tableFeatures()"
          [forceMobile]="mobile"
          [urlSync]="false"
          [cellNavigation]="navigation()"
          [filtersMode]="filterMode()"
          [closeHeaderFilterOnSelect]="closeHeaderFilter()"
          [density]="rowDensity()"
          (densityChange)="onDensityChange($event)"
          [onColumnRename]="renameColumn()"
          [confirm]="confirmAction()"
          [columnLayout]="layout()"
          (columnLayoutChange)="onLayoutChange($event)"
        />
        <output data-host-events>{{ events().join(",") }}</output>
      `,
    })
    class Host {
      readonly rows = signal<readonly Row[]>(ROWS);
      readonly columns = COLUMNS;
      readonly rowKey = (row: Row) => row.id;
      readonly features = signal<readonly AdaptTableFeature[]>([]);
      readonly selected = signal<readonly string[]>([]);
      readonly controlledSelection = signal(true);
      readonly selectable = signal(true);
      readonly selectionIds = computed(() =>
        this.controlledSelection() ? this.selected() : undefined
      );
      readonly tableFeatures = computed(() => {
        const base = this.features();
        if (!this.selectable()) return base;
        return [
          selection({
            selectedIds: this.selectionIds,
            onSelectionChange: (ids: string[]) => {
              this.onSelectionChange(ids);
            },
          }),
          ...base,
        ];
      });
      readonly navigation = signal(false);
      readonly filterMode = signal<"popover" | "drawer">("popover");
      readonly closeHeaderFilter = signal(false);
      readonly rowDensity = signal<"comfortable" | "compact" | undefined>(
        undefined
      );
      readonly onDensityChange = vi.fn();
      readonly renameColumn = signal<
        ((key: string, name: string) => void) | undefined
      >(undefined);
      readonly confirmAction = signal<ConfirmHandler | undefined>(undefined);
      readonly layout = signal<ColumnLayoutState>({
        order: [],
        hidden: [],
        pinned: {},
        widths: {},
      });
      readonly onSelectionChange = vi.fn((ids: string[]) => {
        this.selected.set(ids);
      });
      readonly onLayoutChange = vi.fn((layout: ColumnLayoutState) => {
        this.layout.set(layout);
      });
      readonly events = signal<readonly string[]>([]);
      readonly probe = new EventTarget();
      mobile = false;

      record(value: string): void {
        this.events.update((events) => [...events, value]);
      }
    }

    const fixtures = new Set<ComponentFixture<Host>>();

    async function mount(
      features: (host: Host) => readonly AdaptTableFeature[],
      mobile = false
    ) {
      let context: FeatureMountContext | undefined;
      const capture: AdaptTableFeature = {
        id: "capture-recomposition-runtime",
        mount: (current) => {
          context = current;
        },
      };
      const fixture = TestBed.createComponent(Host);
      fixtures.add(fixture);
      const host = fixture.componentInstance;
      host.mobile = mobile;
      host.features.set([capture, ...features(host)]);
      const root = fixture.nativeElement as HTMLElement;
      document.body.append(root);
      fixture.autoDetectChanges();
      await fixture.whenStable();
      if (!context)
        throw new Error("The mounted feature did not receive its runtime");
      const current = context;
      return {
        fixture,
        host,
        root,
        current,
        settle: () => fixture.whenStable(),
        replace: async (next: readonly AdaptTableFeature[]) => {
          host.features.set([capture, ...next]);
          await fixture.whenStable();
        },
        destroy: () => {
          fixture.destroy();
          fixtures.delete(fixture);
        },
      };
    }

    function one<T extends HTMLElement = HTMLElement>(
      root: ParentNode,
      selector: string
    ): T {
      const element = root.querySelector<T>(selector);
      if (!element) throw new Error(`Missing mounted element: ${selector}`);
      return element;
    }
    const part = (name: string) => kitSelector(name);
    const ids = (root: ParentNode, mobile = false) =>
      [...root.querySelectorAll(part(mobile ? "card" : "row"))].map((row) =>
        row.getAttribute("data-row-id")
      );
    const inputDraft = (editor: HTMLInputElement, value: string) => {
      editor.value = value;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const commitDraft = (editor: HTMLInputElement) =>
      editor.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
      );

    async function openEditor(root: HTMLElement, settle: () => Promise<void>) {
      one(root, part("edit-cell-activate")).dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true })
      );
      await settle();
      return one<HTMLInputElement>(root, part("edit-cell-editor"));
    }

    afterEach(() => {
      for (const fixture of fixtures) fixture.destroy();
      fixtures.clear();
      document.body.replaceChildren();
    });

    describe(`mounted feature recomposition (${kit.name} Angular)`, () => {
      it.each([false, true])(
        "revokes an active editor and its write operation, then uses only the readded callback (mobile=%s)",
        async (mobile) => {
          const oldCommit = vi.fn();
          const newCommit = vi.fn();
          const mounted = await mount(() => [editing<Row>(oldCommit)], mobile);
          const { root, current, host } = mounted;
          const neutral = current.runtime.view()!.neutralTable!;
          expect(neutral.operations.editCells).toBe(true);
          const editor = await openEditor(root, mounted.settle);
          expect(editor.value).toBe("Ada");
          inputDraft(editor, "First edit");
          commitDraft(editor);
          await mounted.settle();
          expect(oldCommit).toHaveBeenCalledExactlyOnceWith(
            ROWS[0],
            "name",
            "First edit"
          );

          const abandoned = await openEditor(root, mounted.settle);
          inputDraft(abandoned, "Abandoned edit");
          await mounted.replace([]);
          expect(root.querySelector(part("edit-cell-editor"))).toBeNull();
          expect(root.querySelector(part("edit-cell-activate"))).toBeNull();
          expect(current.runtime.view()!.editing?.onCellEdit).toBeUndefined();
          expect(neutral.operations.editCells).toBe(false);
          expect(current.runtime.featureIds()).not.toContain("editing");
          commitDraft(abandoned);
          abandoned.dispatchEvent(new FocusEvent("blur"));
          one(root, part(mobile ? "card" : "row")).dispatchEvent(
            new MouseEvent("dblclick", { bubbles: true })
          );
          await mounted.settle();
          expect(root.querySelector(part("edit-cell-editor"))).toBeNull();
          expect(oldCommit).toHaveBeenCalledOnce();
          expect(host.rows()).toEqual(ROWS);

          await mounted.replace([editing<Row>(newCommit)]);
          expect(current.runtime.view()!.neutralTable).toBe(neutral);
          expect(neutral.operations.editCells).toBe(true);
          const fresh = await openEditor(root, mounted.settle);
          expect(fresh.value).toBe("Ada");
          inputDraft(fresh, "Current edit");
          commitDraft(fresh);
          await mounted.settle();
          expect(newCommit).toHaveBeenCalledExactlyOnceWith(
            ROWS[0],
            "name",
            "Current edit"
          );
          expect(oldCommit).toHaveBeenCalledOnce();
          expect(root.querySelector(part("edit-cell-editor"))).toBeNull();
        }
      );

      it.each([false, true])(
        "retains unchanged tree expansion while replacing another feature and keeps table instances independent (mobile=%s)",
        async (mobile) => {
          const hierarchy = tree<Row>({ getChildren: (row) => row.reports });
          const initialPrint = vi.fn();
          const replacementPrint = vi.fn();
          const makeFeatures = (host: Host) => {
            host.rows.set([
              {
                id: "parent",
                name: "Parent",
                team: "Core",
                reports: [{ id: "child", name: "Child", team: "Core" }],
              },
            ]);
            return [hierarchy, print(initialPrint, true)];
          };
          const first = await mount(makeFeatures, mobile);
          const second = await mount(makeFeatures, mobile);
          one(first.root, part("tree-toggle")).click();
          await first.settle();
          expect(ids(first.root, mobile)).toEqual(["parent", "child"]);
          expect(ids(second.root, mobile)).toEqual(["parent"]);
          await first.replace([hierarchy, print(replacementPrint, true)]);
          expect(ids(first.root, mobile)).toEqual(["parent", "child"]);
          expect(
            one(first.root, part("tree-toggle")).getAttribute("aria-expanded")
          ).toBe("true");
          expect(ids(second.root, mobile)).toEqual(["parent"]);
          one(first.root, part("print-button")).click();
          one(second.root, part("print-button")).click();
          expect(replacementPrint).toHaveBeenCalledExactlyOnceWith();
          expect(initialPrint).toHaveBeenCalledExactlyOnceWith();
          one(first.root, part("tree-toggle")).click();
          await first.settle();
          expect(ids(first.root, mobile)).toEqual(["parent"]);
          first.destroy();
          one(second.root, part("tree-toggle")).click();
          await second.settle();
          expect(ids(second.root, mobile)).toEqual(["parent", "child"]);
        }
      );

      it("follows controlled density input changes and emits chooser requests without replacing features", async () => {
        const mounted = await mount((host) => {
          host.rowDensity.set("comfortable");
          return [densityChooser()];
        });
        const { root, host, current } = mounted;
        const features = host.features();
        const neutral = current.runtime.view()!.neutralTable;
        current.flush(() => current.runtime.view()!.query!.setSearch("Ada"));
        await mounted.settle();
        expect(one(root, part("root")).getAttribute("data-density")).toBe(
          "comfortable"
        );
        one(root, part("density-toggle")).click();
        await mounted.settle();
        expect(host.onDensityChange).toHaveBeenLastCalledWith("compact");
        expect(one(root, part("root")).getAttribute("data-density")).toBe(
          "comfortable"
        );
        expect(one(root, part("density-toggle")).textContent).toContain(
          "Comfortable"
        );
        host.rowDensity.set("compact");
        await mounted.settle();
        expect(one(root, part("root")).getAttribute("data-density")).toBe(
          "compact"
        );
        expect(one(root, part("density-toggle")).textContent).toContain(
          "Compact"
        );
        one(root, part("density-toggle")).click();
        await mounted.settle();
        expect(host.onDensityChange).toHaveBeenLastCalledWith("comfortable");
        expect(one(root, part("root")).getAttribute("data-density")).toBe(
          "compact"
        );
        host.rowDensity.set("comfortable");
        await mounted.settle();
        expect(one(root, part("root")).getAttribute("data-density")).toBe(
          "comfortable"
        );
        expect(host.features()).toBe(features);
        expect(current.runtime.view()!.neutralTable).toBe(neutral);
        expect(current.runtime.view()!.query!.search).toBe("Ada");
        expect(ids(root)).toEqual(["1"]);
        expect(host.onDensityChange).toHaveBeenCalledTimes(2);
      });

      it("uses the latest column rename callback and removes editing when that callback is cleared", async () => {
        const firstRename = vi.fn();
        const nextRename = vi.fn();
        const mounted = await mount((host) => {
          host.renameColumn.set(firstRename);
          host.layout.set({
            order: ["team", "name"],
            hidden: ["team"],
            pinned: { name: "start" },
            widths: { name: 184 },
          });
          return [columnMenu()];
        });
        const { root, host } = mounted;
        const features = host.features();
        const rename = async (name: string) => {
          one(root, part("header-rename-button")).click();
          await mounted.settle();
          inputDraft(
            one<HTMLInputElement>(root, part("header-rename-input")),
            name
          );
          one(root, part("header-rename-form")).dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true })
          );
          await mounted.settle();
          expect(
            one(root, `${part("header-cell")}[data-column-key="name"]`)
              .textContent
          ).toContain(name);
        };
        await rename("First name");
        expect(firstRename).toHaveBeenCalledExactlyOnceWith(
          "name",
          "First name"
        );
        const firstLayout = host.layout();
        host.renameColumn.set(nextRename);
        await mounted.settle();
        expect(host.layout()).toBe(firstLayout);
        await rename("Current name");
        expect(nextRename).toHaveBeenCalledExactlyOnceWith(
          "name",
          "Current name"
        );
        expect(firstRename).toHaveBeenCalledOnce();
        expect(host.layout()).toMatchObject({
          order: ["team", "name"],
          hidden: ["team"],
          pinned: { name: "start" },
          widths: { name: 184 },
        });
        const currentLayout = host.layout();
        one(root, part("header-rename-button")).click();
        await mounted.settle();
        inputDraft(
          one<HTMLInputElement>(root, part("header-rename-input")),
          "Removed callback"
        );
        const abandonedForm = one(root, part("header-rename-form"));
        host.renameColumn.set(undefined);
        await mounted.settle();
        expect(root.querySelector(part("header-rename-button"))).toBeNull();
        expect(root.querySelector(part("header-rename-form"))).toBeNull();
        abandonedForm.dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
        await mounted.settle();
        expect(firstRename).toHaveBeenCalledOnce();
        expect(nextRename).toHaveBeenCalledOnce();
        expect(host.layout()).toBe(currentLayout);
        expect(
          one(root, `${part("header-cell")}[data-column-key="name"]`)
            .textContent
        ).toContain("Current name");
        expect(one(root, part("column-menu-button"))).toBeDefined();
        expect(host.features()).toBe(features);
        expect(ids(root)).toEqual(["1", "2"]);
      });

      it("consults the current confirmation handler before running an unchanged row action", async () => {
        const denied = vi.fn<ConfirmHandler>(() => undefined);
        const approved = vi.fn<ConfirmHandler>((request) =>
          request.onConfirm()
        );
        const archived = vi.fn();
        const mounted = await mount((host) => {
          host.confirmAction.set(denied);
          return [
            rowActions<Row>([
              {
                key: "archive",
                label: "Archive",
                confirm: {
                  title: "Archive person?",
                  message: (row) => `Archive ${row.name}?`,
                  confirmLabel: "Archive",
                },
                onClick: (row) => {
                  archived(row);
                  host.rows.update((rows) =>
                    rows.filter((current) => current.id !== row.id)
                  );
                },
              },
            ]),
          ];
        });
        const { root, host } = mounted;
        const features = host.features();
        const archive = async (id: string) => {
          one(
            root,
            `${part("row")}[data-row-id="${id}"] ${part("action-button")}`
          ).click();
          await mounted.settle();
        };
        await archive("1");
        expect(denied).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            title: "Archive person?",
            message: "Archive Ada?",
            confirmLabel: "Archive",
          })
        );
        expect(archived).not.toHaveBeenCalled();
        expect(ids(root)).toEqual(["1", "2"]);
        host.confirmAction.set(approved);
        await mounted.settle();
        await archive("1");
        expect(approved).toHaveBeenCalledExactlyOnceWith(
          expect.objectContaining({
            title: "Archive person?",
            message: "Archive Ada?",
            confirmLabel: "Archive",
          })
        );
        expect(denied).toHaveBeenCalledOnce();
        expect(archived).toHaveBeenCalledExactlyOnceWith(ROWS[0]);
        expect(ids(root)).toEqual(["2"]);
        host.confirmAction.set(denied);
        await mounted.settle();
        await archive("2");
        expect(denied).toHaveBeenLastCalledWith(
          expect.objectContaining({ message: "Archive Grace?" })
        );
        expect(approved).toHaveBeenCalledOnce();
        expect(archived).toHaveBeenCalledOnce();
        expect(ids(root)).toEqual(["2"]);
        expect(host.features()).toBe(features);
      });

      it("releases replaced, removed and destroyed mount listeners exactly once", async () => {
        const cleanup = vi.fn();
        const started = vi.fn();
        // Each version is its own dependency: a new version replaces the
        // mounted listener, a re-declared one keeps it.
        const lifecycle = (host: Host, version: string): AdaptTableFeature => ({
          id: "live-probe",
          dependencies: [version],
          setup: () => {
            started(`${version}:setup`);
          },
          mount: () => {
            started(`${version}:mount`);
            const listener = () => host.record(`${version}:mount`);
            host.probe.addEventListener("probe", listener);
            return () => {
              host.probe.removeEventListener("probe", listener);
              cleanup(`${version}:mount`);
            };
          },
        });
        let first: AdaptTableFeature | undefined;
        const mounted = await mount((host) => {
          first = lifecycle(host, "first");
          return [first];
        });
        const probe = async () => {
          mounted.host.events.set([]);
          mounted.host.probe.dispatchEvent(new Event("probe"));
          await mounted.settle();
          return one(mounted.root, "[data-host-events]").textContent;
        };
        const released = () =>
          cleanup.mock.calls
            .map(([value]) => value as string)
            .sort((left, right) => left.localeCompare(right));
        expect(await probe()).toBe("first:mount");
        expect(started.mock.calls.map(([value]) => value)).toEqual([
          "first:setup",
          "first:mount",
        ]);
        if (!first)
          throw new Error("The initial lifecycle feature was not created");
        await mounted.replace([first]);
        expect(await probe()).toBe("first:mount");
        expect(started).toHaveBeenCalledTimes(2);
        expect(cleanup).not.toHaveBeenCalled();

        await mounted.replace([lifecycle(mounted.host, "second")]);
        expect(await probe()).toBe("second:mount");
        expect(released()).toEqual(["first:mount"]);
        await mounted.replace([]);
        expect(await probe()).toBe("");
        expect(released()).toEqual(["first:mount", "second:mount"]);
        await mounted.replace([lifecycle(mounted.host, "third")]);
        expect(await probe()).toBe("third:mount");
        mounted.destroy();
        mounted.host.events.set([]);
        mounted.host.probe.dispatchEvent(new Event("probe"));
        expect(mounted.host.events()).toEqual([]);
        expect(released()).toEqual([
          "first:mount",
          "second:mount",
          "third:mount",
        ]);
      });
    });
  });
}
