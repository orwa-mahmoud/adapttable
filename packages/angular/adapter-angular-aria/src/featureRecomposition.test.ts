/** Feature identities change while the mounted table and its state stay alive. */

import {
  type AdaptTableFeature,
  type ColumnDef,
  type ColumnLayoutState,
  type ConfirmHandler,
  type FeatureMountContext,
} from "@adapttable/angular";
import { cellNavigation } from "@adapttable/angular-aria/cell-navigation";
import { columnMenu } from "@adapttable/angular-aria/column-menu";
import { filters } from "@adapttable/angular-aria/filters";
import { headerFilters } from "@adapttable/angular-aria/header-filters";
import { pinnedSummaryRows } from "@adapttable/angular-aria/pinned-summary-rows";
import { print } from "@adapttable/angular-aria/print";
import { selection } from "@adapttable/angular-aria/selection";
import { tree } from "@adapttable/angular-aria/tree";
import { Component, computed, signal } from "@angular/core";

import { declareFeatureOptions } from "../../angular/test/kit/declareFeatureOptions";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { featureRecompositionTests } from "../../angular/test/kit/suites/featureRecomposition";
import { kit } from "../testing/kit";
import { fixtureOverlayProviders } from "../testing/overlayFixture";
import { AdaptDataTable } from "./dataTable";

for (const test of featureRecompositionTests(kit)) it(test.name, test.run);

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
  providers: fixtureOverlayProviders,
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="tableFeatures()"
      [forceMobile]="mobile"
      [urlSync]="false"
      [density]="rowDensity()"
      (densityChange)="onDensityChange($event)"
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
  readonly navigation = signal(false);
  readonly tableFeatures = computed(() => {
    const base = declareFeatureOptions(this.features(), {
      filters: { filtersMode: this.filterMode() },
      "header-filters": {
        closeHeaderFilterOnSelect: this.closeHeaderFilter(),
      },
      "column-menu": { onColumnRename: this.renameColumn() },
    });
    const listed = this.navigation() ? [cellNavigation(), ...base] : base;
    if (!this.selectable()) return listed;
    return [
      selection({
        selectedIds: this.selectionIds,
        onSelectionChange: (ids: string[]) => {
          this.onSelectionChange(ids);
        },
      }),
      ...listed,
    ];
  });
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
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const ids = (root: ParentNode, mobile = false) =>
  [...root.querySelectorAll(part(mobile ? "card" : "row"))].map((row) =>
    row.getAttribute("data-row-id")
  );
const inputDraft = (editor: HTMLInputElement, value: string) => {
  editor.value = value;
  editor.dispatchEvent(new Event("input", { bubbles: true }));
};

afterEach(() => {
  for (const fixture of fixtures) fixture.destroy();
  fixtures.clear();
  document.body.replaceChildren();
});

describe("mounted feature recomposition (unstyled Angular)", () => {
  it("replaces summary content and print callbacks without resetting query, selection or column layout", async () => {
    const menu = columnMenu();
    const firstPrint = vi.fn();
    const nextPrint = vi.fn();
    const mounted = await mount(() => [
      menu,
      pinnedSummaryRows<Row>({
        top: [{ id: "total", name: "Original total", team: "Two teams" }],
      }),
      print(firstPrint, true),
    ]);
    const { current, host, root } = mounted;
    const neutral = current.runtime.view()!.neutralTable!;
    one(root, part("print-button")).click();
    expect(firstPrint).toHaveBeenCalledExactlyOnceWith();
    expect(one(root, part("pinned-summary-top")).textContent).toContain(
      "Original total"
    );
    current.flush(() =>
      current.runtime.view()!.columnLayout!.setOrder!(["team", "name"])
    );
    current.flush(() =>
      current.runtime.view()!.columnLayout!.setHidden!("team", true)
    );
    current.flush(() => current.runtime.view()!.query!.setSearch("Grace"));
    current.flush(() => current.runtime.view()!.query!.setSort("name", "desc"));
    await mounted.settle();
    // Search changes the selection scope; establish selection after it settles
    // so this case isolates preservation across unrelated feature replacement.
    current.flush(() => current.runtime.view()!.selection!.replace(["2"]));
    await mounted.settle();
    const selected = host.selected();
    const layout = host.layout();
    const selectionChanges = host.onSelectionChange.mock.calls.length;
    const layoutChanges = host.onLayoutChange.mock.calls.length;
    expect(layout).toMatchObject({ order: ["team", "name"], hidden: ["team"] });
    expect(ids(root)).toEqual(["2"]);
    expect(one<HTMLInputElement>(root, part("search")).value).toBe("Grace");
    expect(one(root, '[aria-sort="descending"]').textContent).toContain("Name");
    expect(
      one<HTMLInputElement>(root, '[data-row-id="2"] input[type="checkbox"]')
        .checked
    ).toBe(true);

    await mounted.replace([
      menu,
      pinnedSummaryRows<Row>({
        top: [{ id: "total", name: "Revised total", team: "Fresh values" }],
      }),
      print(nextPrint, true),
    ]);
    expect(one(root, part("pinned-summary-top")).textContent).toContain(
      "Revised total"
    );
    expect(root.textContent).not.toContain("Original total");
    one(root, part("print-button")).click();
    expect(nextPrint).toHaveBeenCalledExactlyOnceWith();
    expect(firstPrint).toHaveBeenCalledOnce();
    expect(current.runtime.view()!.neutralTable).toBe(neutral);
    expect(current.runtime.view()!.query).toMatchObject({
      search: "Grace",
      sortBy: "name",
      sortDir: "desc",
    });
    expect(host.selected()).toBe(selected);
    expect(host.layout()).toBe(layout);
    expect(host.onSelectionChange).toHaveBeenCalledTimes(selectionChanges);
    expect(host.onLayoutChange).toHaveBeenCalledTimes(layoutChanges);
    expect(ids(root)).toEqual(["2"]);
    expect(
      one<HTMLInputElement>(root, '[data-row-id="2"] input[type="checkbox"]')
        .checked
    ).toBe(true);
    expect(
      [...root.querySelectorAll(`${part("header-cell")}[data-column-key]`)].map(
        (header) => header.getAttribute("data-column-key")
      )
    ).toEqual(["name"]);

    await mounted.replace([menu]);
    expect(root.querySelector(part("pinned-summary-top"))).toBeNull();
    expect(root.querySelector(part("print-button"))).toBeNull();
    expect(current.runtime.featureIds()).not.toContain("print");
    expect(ids(root)).toEqual(["2"]);
    await mounted.replace([
      menu,
      pinnedSummaryRows<Row>({
        bottom: [{ id: "new-total", name: "Added total", team: "Current" }],
      }),
      print(nextPrint, true),
    ]);
    expect(one(root, part("pinned-summary-bottom")).textContent).toContain(
      "Added total"
    );
    one(root, part("print-button")).click();
    expect(nextPrint).toHaveBeenCalledTimes(2);
    expect(firstPrint).toHaveBeenCalledOnce();
    expect(host.selected()).toBe(selected);
    expect(host.layout()).toBe(layout);
  });

  it("rebuilds the tree from a later feature's replaced options while retaining unrelated state", async () => {
    const hierarchy = tree<Row>({
      getChildren: (row) => row.reports,
      expandedIds: ["parent"],
    });
    const menu = columnMenu();
    const oldChildren = vi.fn((row: Row) => row.reports);
    const newChild: Row = { id: "new-child", name: "New child", team: "Core" };
    const newChildren = vi.fn((row: Row) =>
      row.id === "parent" ? [newChild] : undefined
    );
    const treeOptions = (
      getChildren: (row: Row) => readonly Row[] | undefined,
      treeColumn: string
    ): AdaptTableFeature => ({
      id: "tree-options",
      apply: () => ({ getChildren, treeColumn }),
    });
    const mounted = await mount((host) => {
      host.rows.set([
        {
          id: "parent",
          name: "Parent",
          team: "Core",
          reports: [{ id: "old-child", name: "Old child", team: "Core" }],
        },
        { id: "other", name: "Other", team: "Research" },
      ]);
      return [menu, hierarchy, treeOptions(oldChildren, "name")];
    });
    const { root, host, current } = mounted;
    const neutral = current.runtime.view()!.neutralTable!;
    current.flush(() => current.runtime.view()!.query!.setSearch("Parent"));
    current.flush(() => current.runtime.view()!.selection!.replace(["parent"]));
    current.flush(() =>
      current.runtime.view()!.columnLayout!.setOrder!(["team", "name"])
    );
    await mounted.settle();
    const selected = host.selected();
    const layout = host.layout();
    const treeCell = () =>
      one(root, `${part("row")}[data-row-id="parent"] ${part("tree-cell")}`);
    expect(ids(root)).toEqual(["parent", "old-child"]);
    expect(treeCell().textContent).toContain("Parent");
    const oldReads = oldChildren.mock.calls.length;
    expect(oldReads).toBeGreaterThan(0);

    await mounted.replace([menu, hierarchy, treeOptions(newChildren, "team")]);
    expect(ids(root)).toEqual(["parent", "new-child"]);
    expect(root.textContent).toContain("New child");
    expect(root.textContent).not.toContain("Old child");
    expect(treeCell().textContent).toContain("Core");
    expect(treeCell().textContent).not.toContain("Parent");
    expect(newChildren).toHaveBeenCalledWith(host.rows()[0]);
    expect(oldChildren).toHaveBeenCalledTimes(oldReads);
    expect(current.runtime.view()!.neutralTable).toBe(neutral);
    expect(current.runtime.view()!.query!.search).toBe("Parent");
    expect(one<HTMLInputElement>(root, part("search")).value).toBe("Parent");
    expect(host.selected()).toBe(selected);
    expect(host.layout()).toBe(layout);
    expect(layout.order).toEqual(["team", "name"]);
    expect(
      one<HTMLInputElement>(
        root,
        '[data-row-id="parent"] input[type="checkbox"]'
      ).checked
    ).toBe(true);
  });

  it("retains lazily created uncontrolled selection across disabled controls and capabilities", async () => {
    const mounted = await mount((host) => {
      host.selectable.set(false);
      host.controlledSelection.set(false);
      return [];
    });
    const { root, host, current } = mounted;
    const neutral = current.runtime.view()!.neutralTable!;
    expect(current.runtime.view()!.selection).toBeUndefined();
    expect(neutral.operations.setSelection).toBe(false);
    expect(root.querySelector('input[type="checkbox"]')).toBeNull();

    host.selectable.set(true);
    await mounted.settle();
    one<HTMLInputElement>(
      root,
      '[data-row-id="2"] input[type="checkbox"]'
    ).click();
    await mounted.settle();
    expect([...current.runtime.view()!.selection!.selectedIds]).toEqual(["2"]);
    expect(neutral.operations.setSelection).toBe(true);
    expect(host.onSelectionChange).toHaveBeenCalledExactlyOnceWith(["2"]);

    host.selectable.set(false);
    await mounted.settle();
    expect(current.runtime.view()!.selection).toBeUndefined();
    expect(neutral.operations.setSelection).toBe(false);
    expect(root.querySelector('input[type="checkbox"]')).toBeNull();
    expect(host.onSelectionChange).toHaveBeenCalledOnce();

    host.selectable.set(true);
    await mounted.settle();
    expect(current.runtime.view()!.neutralTable).toBe(neutral);
    expect([...current.runtime.view()!.selection!.selectedIds]).toEqual(["2"]);
    expect(neutral.operations.setSelection).toBe(true);
    expect(
      one<HTMLInputElement>(root, '[data-row-id="2"] input[type="checkbox"]')
        .checked
    ).toBe(true);
    expect(host.onSelectionChange).toHaveBeenCalledOnce();
  });

  it("toggles selection through its feature and keyboard navigation by composing it", async () => {
    const mounted = await mount((host) => {
      host.selectable.set(false);
      return [];
    });
    const { root, host } = mounted;
    const features = host.features();
    const cells = () => [...root.querySelectorAll<HTMLElement>(part("cell"))];
    expect(root.querySelector('input[type="checkbox"]')).toBeNull();
    expect(one(root, part("table")).getAttribute("role")).not.toBe("grid");

    host.selectable.set(true);
    await mounted.settle();
    one<HTMLInputElement>(
      root,
      '[data-row-id="2"] input[type="checkbox"]'
    ).click();
    await mounted.settle();
    expect(host.selected()).toEqual(["2"]);
    expect(host.onSelectionChange).toHaveBeenLastCalledWith(["2"]);
    host.navigation.set(true);
    await mounted.settle();
    expect(one(root, part("table")).getAttribute("role")).toBe("grid");
    expect(cells().map((cell) => cell.getAttribute("tabindex"))).toEqual([
      "0",
      "-1",
      "-1",
      "-1",
    ]);
    cells()[0]!.focus();
    cells()[0]!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      })
    );
    await mounted.settle();
    expect(document.activeElement).toBe(cells()[1]);

    host.navigation.set(false);
    await mounted.settle();
    expect(one(root, part("table")).getAttribute("role")).not.toBe("grid");
    expect(cells().every((cell) => !cell.hasAttribute("tabindex"))).toBe(true);
    const focused = document.activeElement;
    const inactiveArrow = new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    });
    cells()[0]!.dispatchEvent(inactiveArrow);
    await mounted.settle();
    expect(inactiveArrow.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(focused);
    host.selectable.set(false);
    await mounted.settle();
    expect(root.querySelector('input[type="checkbox"]')).toBeNull();
    expect(host.selected()).toEqual(["2"]);
    host.selectable.set(true);
    await mounted.settle();
    expect(
      one<HTMLInputElement>(root, '[data-row-id="2"] input[type="checkbox"]')
        .checked
    ).toBe(true);
    expect(host.features()).toBe(features);
    expect(ids(root)).toEqual(["1", "2"]);
  });

  it("changes filter popover and drawer modes while keeping the current filter", async () => {
    const mounted = await mount(() => [
      filters<Row>([{ key: "name", type: "text", label: "Name" }]),
    ]);
    const { root, host } = mounted;
    const features = host.features();
    const open = async () => {
      one(root, part("filters-button")).click();
      await mounted.settle();
    };
    await open();
    const popover = one(root, part("filters-popover"));
    expect(root.querySelector(part("filters-backdrop"))).toBeNull();
    inputDraft(one<HTMLInputElement>(popover, part("filter-input")), "Ada");
    await mounted.settle();
    expect(ids(root)).toEqual(["1"]);
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await mounted.settle();
    expect(root.querySelector(part("filters-popover"))).toBeNull();

    host.filterMode.set("drawer");
    await mounted.settle();
    await open();
    const panel = one(root, part("filters-panel"));
    expect(panel.tagName).toBe("DIALOG");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    expect(root.querySelector(part("filters-backdrop"))).not.toBeNull();
    expect(root.querySelector(part("filters-popover"))).toBeNull();
    const field = one<HTMLInputElement>(panel, part("filter-input"));
    expect(field.value).toBe("Ada");
    inputDraft(field, "Grace");
    await mounted.settle();
    expect(ids(root)).toEqual(["2"]);
    one(root, part("filters-done")).click();
    await mounted.settle();
    expect(root.querySelector(part("filters-panel"))).toBeNull();
    host.filterMode.set("popover");
    await mounted.settle();
    await open();
    expect(
      one<HTMLInputElement>(
        one(root, part("filters-popover")),
        part("filter-input")
      ).value
    ).toBe("Grace");
    expect(root.querySelector(part("filters-backdrop"))).toBeNull();
    expect(ids(root)).toEqual(["2"]);
    expect(host.features()).toBe(features);
  });

  it("uses the current header-filter close-on-select input for real selections", async () => {
    const mounted = await mount(() => [
      filters<Row>([
        {
          key: "team",
          type: "select",
          label: "Team",
          options: [
            { value: "Core", label: "Core" },
            { value: "Research", label: "Research" },
          ],
        },
      ]),
      headerFilters(),
    ]);
    const { root, host } = mounted;
    const features = host.features();
    const setHeader = async (open: boolean) => {
      const trigger = one<HTMLDetailsElement>(
        root,
        part("filter-header-trigger")
      );
      trigger.open = open;
      trigger.dispatchEvent(new Event("toggle"));
      await mounted.settle();
    };
    const openHeader = () => setHeader(true);
    const closeHeader = () => setHeader(false);
    const choose = async (value: string) => {
      const select = one<HTMLSelectElement>(root, part("filter-select"));
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await mounted.settle();
    };
    await openHeader();
    await choose("Research");
    expect(ids(root)).toEqual(["2"]);
    expect(root.querySelector(part("filter-header-cell"))).not.toBeNull();
    await closeHeader();
    host.closeHeaderFilter.set(true);
    await mounted.settle();
    await openHeader();
    await choose("Core");
    expect(ids(root)).toEqual(["1"]);
    expect(root.querySelector(part("filter-header-cell"))).toBeNull();
    host.closeHeaderFilter.set(false);
    await mounted.settle();
    await openHeader();
    await choose("Research");
    expect(ids(root)).toEqual(["2"]);
    expect(root.querySelector(part("filter-header-cell"))).not.toBeNull();
    expect(host.features()).toBe(features);
  });
});
