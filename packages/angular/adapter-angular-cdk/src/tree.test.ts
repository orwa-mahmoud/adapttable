/**
 * Tree rows through the unstyled table: the chevron in the tree column, the
 * indent by depth, children fetched as a node opens, and the same disclosure
 * at the head of each phone card.
 */
import {
  type AdaptTableFeature,
  type ColumnDef,
  type TableLabels,
  tree as bindingTree,
} from "@adapttable/angular";
import { tree } from "@adapttable/angular-cdk/tree";
import { virtualize } from "@adapttable/angular-cdk/virtualize";
import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdaptDataTable } from "./dataTable";

interface Person {
  id: string;
  name: string;
  team: string;
  reports?: Person[];
}

const PEOPLE: Person[] = [
  {
    id: "1",
    name: "Ada",
    team: "Core",
    reports: [
      {
        id: "2",
        name: "Grace",
        team: "Core",
        reports: [{ id: "3", name: "Linus", team: "Web" }],
      },
    ],
  },
  { id: "4", name: "Alan", team: "Data" },
];

const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", accessor: (row) => row.name },
  { key: "team", accessor: (row) => row.team },
];

let mobile = false;
let controlled = false;
let onLoadChildren: ((row: Person) => Promise<void>) | undefined;
let features: readonly AdaptTableFeature[] | undefined;

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile"
      [dir]="direction()"
      [labels]="labels()"
      paginationMode="infinite"
      [maxHeight]="400"
      [features]="features"
    />
  `,
})
class Host {
  readonly rows = signal<readonly Person[]>(PEOPLE);
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
  readonly mobile = mobile;
  readonly direction = signal<"ltr" | "rtl">("ltr");
  readonly labels = signal<TableLabels>({});
  readonly expandedIds = signal<readonly string[]>([]);
  readonly onExpandedIdsChange = vi.fn((ids: string[]) => {
    this.expandedIds.set(ids);
  });
  readonly features = features ?? [
    tree<Person>({
      getChildren: (row) => row.reports,
      hasChildren: (row) => row.reports !== undefined || row.id === "4",
      onLoadChildren,
      ...(controlled
        ? {
            expandedIds: this.expandedIds,
            onExpandedIdsChange: this.onExpandedIdsChange,
          }
        : {}),
    }),
  ];
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    host: fixture.componentInstance,
    root: fixture.nativeElement as HTMLElement,
    settle: () => fixture.whenStable(),
  };
}

const parts = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-adapttable-part="${name}"]`),
];
const rowIds = (part: "row" | "card", root: ParentNode = document) =>
  parts(part, root).map((row) => row.getAttribute("data-row-id"));
const toggleOf = (container: Element) =>
  container.querySelector<HTMLButtonElement>(
    '[data-adapttable-part="tree-toggle"]'
  )!;
const rowById = (id: string) =>
  document.querySelector(`[data-adapttable-part="row"][data-row-id="${id}"]`)!;

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute("dir");
  mobile = false;
  controlled = false;
  onLoadChildren = undefined;
  features = undefined;
});

describe("the unstyled table's tree", () => {
  it("starts folded, with a chevron in the tree column only", async () => {
    await mount();
    expect(rowIds("row")).toEqual(["1", "4"]);
    const cells = rowById("1").querySelectorAll(
      '[data-adapttable-part="cell"]'
    );
    const treeCell = cells[0]!.querySelector(
      '[data-adapttable-part="tree-cell"]'
    );
    expect(treeCell?.textContent).toContain("Ada");
    expect(
      cells[1]!.querySelector('[data-adapttable-part="tree-cell"]')
    ).toBeNull();
    expect(cells[1]!.textContent.trim()).toBe("Core");
    const toggle = toggleOf(rowById("1"));
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(toggle.getAttribute("aria-label")).toBe("Expand row");
  });

  it.each([false, true])(
    "follows independent host expansion signals through callbacks and external clears (mobile=%s)",
    async (isMobile) => {
      mobile = isMobile;
      controlled = true;
      const first = await mount();
      const second = await mount();
      const part = isMobile ? "card" : "row";
      const row = (root: ParentNode, id: string) =>
        root.querySelector(
          `[data-adapttable-part="${part}"][data-row-id="${id}"]`
        )!;
      const ids = (root: ParentNode) => rowIds(part, root);
      expect(ids(first.root)).toEqual(["1", "4"]);
      expect(ids(second.root)).toEqual(["1", "4"]);

      toggleOf(row(first.root, "1")).click();
      await first.settle();
      expect(first.host.onExpandedIdsChange).toHaveBeenLastCalledWith(["1"]);
      expect(first.host.expandedIds()).toEqual(["1"]);
      expect(ids(first.root)).toEqual(["1", "2", "4"]);
      expect(toggleOf(row(first.root, "1")).getAttribute("aria-expanded")).toBe(
        "true"
      );
      expect(ids(second.root)).toEqual(["1", "4"]);
      expect(second.host.onExpandedIdsChange).not.toHaveBeenCalled();

      toggleOf(row(first.root, "2")).click();
      await first.settle();
      expect(first.host.expandedIds()).toEqual(["1", "2"]);
      expect(ids(first.root)).toEqual(["1", "2", "3", "4"]);
      first.host.expandedIds.set(["1"]);
      await first.settle();
      expect(ids(first.root)).toEqual(["1", "2", "4"]);
      expect(toggleOf(row(first.root, "2")).getAttribute("aria-expanded")).toBe(
        "false"
      );
      toggleOf(row(first.root, "1")).click();
      await first.settle();
      expect(first.host.onExpandedIdsChange).toHaveBeenLastCalledWith([]);
      expect(ids(first.root)).toEqual(["1", "4"]);

      second.host.expandedIds.set(["1", "2"]);
      await second.settle();
      expect(ids(second.root)).toEqual(["1", "2", "3", "4"]);
      expect(ids(first.root)).toEqual(["1", "4"]);
      second.host.expandedIds.set([]);
      await second.settle();
      expect(ids(second.root)).toEqual(["1", "4"]);
      expect(
        toggleOf(row(second.root, "1")).getAttribute("aria-expanded")
      ).toBe("false");
      expect(second.host.onExpandedIdsChange).not.toHaveBeenCalled();
      expect(first.host.onExpandedIdsChange).toHaveBeenCalledTimes(3);
    }
  );

  it("relabels desktop tree disclosures when only the labels change", async () => {
    const { host, settle } = await mount();
    const toggle = toggleOf(rowById("1"));
    expect(toggle.getAttribute("aria-label")).toBe("Expand row");
    host.labels.set({
      expandRow: "Afficher les enfants",
      collapseRow: "Masquer les enfants",
    });
    await settle();
    expect(toggle.getAttribute("aria-label")).toBe("Afficher les enfants");
    expect(rowIds("row")).toEqual(["1", "4"]);
    toggle.click();
    await settle();
    expect(toggle.getAttribute("aria-label")).toBe("Masquer les enfants");
    expect(rowIds("row")).toEqual(["1", "2", "4"]);
    host.labels.set({
      expandRow: "Show children",
      collapseRow: "Hide children",
    });
    await settle();
    expect(toggle.getAttribute("aria-label")).toBe("Hide children");
    expect(rowIds("row")).toEqual(["1", "2", "4"]);
  });

  it("opens a node to show its children, indented by depth", async () => {
    const { settle } = await mount();
    toggleOf(rowById("1")).click();
    await settle();
    expect(rowIds("row")).toEqual(["1", "2", "4"]);
    expect(toggleOf(rowById("1")).getAttribute("aria-expanded")).toBe("true");
    const child = rowById("2").querySelector<HTMLElement>(
      '[data-adapttable-part="tree-cell"]'
    )!;
    expect(child.style.paddingInlineStart).toBe("1.5rem");

    toggleOf(rowById("2")).click();
    await settle();
    expect(rowIds("row")).toEqual(["1", "2", "3", "4"]);
    // A leaf holds the chevron's place, so its name lines up.
    expect(
      rowById("3").querySelector('[data-adapttable-part="tree-spacer"]')
    ).not.toBeNull();

    toggleOf(rowById("1")).click();
    await settle();
    expect(rowIds("row")).toEqual(["1", "4"]);
  });

  it("fetches a node's children as it opens, and shows it loading", async () => {
    let finish!: () => void;
    onLoadChildren = vi.fn(
      () =>
        new Promise<void>((done) => {
          finish = done;
        })
    );
    const { host, settle } = await mount();
    toggleOf(rowById("4")).click();
    await settle();
    expect(onLoadChildren).toHaveBeenCalledWith(
      expect.objectContaining({ id: "4" })
    );
    expect(toggleOf(rowById("4")).getAttribute("aria-busy")).toBe("true");

    host.rows.set([
      PEOPLE[0]!,
      { ...PEOPLE[1]!, reports: [{ id: "5", name: "Barbara", team: "Data" }] },
    ]);
    finish();
    await settle();
    await vi.waitFor(() => {
      expect(toggleOf(rowById("4")).getAttribute("aria-busy")).toBeNull();
    });
    expect(rowIds("row")).toEqual(["1", "4", "5"]);
  });

  it("leads each phone card with the disclosure, and indents a child card", async () => {
    mobile = true;
    const { settle } = await mount();
    const card = (id: string) =>
      document.querySelector<HTMLElement>(
        `[data-adapttable-part="card"][data-row-id="${id}"]`
      )!;
    expect(rowIds("card")).toEqual(["1", "4"]);
    toggleOf(card("1")).click();
    await settle();
    expect(rowIds("card")).toEqual(["1", "2", "4"]);
    expect(card("2").style.marginInlineStart).toBe("1.25rem");
    expect(card("1").style.marginInlineStart).toBe("");
    expect(toggleOf(card("1")).getAttribute("aria-expanded")).toBe("true");
  });

  it.each([false, true])(
    "follows live inherited direction without turning an open chevron sideways (mobile=%s)",
    async (isMobile) => {
      mobile = isMobile;
      document.body.setAttribute("dir", "rtl");
      const { host, settle } = await mount();
      const row = parts(isMobile ? "card" : "row")[0]!;
      const toggle = toggleOf(row);
      const wrapper = toggle.querySelector<HTMLElement>(".tree-chevron")!;
      const icon = toggle.querySelector<SVGElement>("svg")!;
      expect(icon.getAttribute("aria-hidden")).toBe("true");
      expect(icon.querySelector("path")?.getAttribute("d")).toBe(
        "m9 6 6 6-6 6"
      );
      expect(icon.style.transform).toBe("");
      expect(getComputedStyle(wrapper).transform).not.toBe("scaleX(-1)");

      host.direction.set("rtl");
      await settle();
      expect(getComputedStyle(wrapper).transform).toBe("scaleX(-1)");
      toggle.click();
      await settle();
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(toggle.getAttribute("aria-label")).toBe("Collapse row");
      expect(icon.style.transform).toBe("rotate(90deg)");

      host.direction.set("ltr");
      await settle();
      expect(getComputedStyle(wrapper).transform).not.toBe("scaleX(-1)");
      expect(icon.style.transform).toBe("rotate(90deg)");
      toggle.click();
      await settle();
      expect(icon.style.transform).toBe("");
      expect(toggle.getAttribute("aria-label")).toBe("Expand row");
    }
  );

  it("windows a virtualized tree over its open nodes", async () => {
    // jsdom lays nothing out: give the scroll box a height to window into.
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(
      function (this: HTMLElement) {
        return this.dataset.adapttablePart === "scroll-box" ? 200 : 40;
      }
    );
    features = [
      tree<Person>({ getChildren: (row) => row.reports }),
      virtualize({ estimateRowSize: 40 }),
    ];
    const { settle } = await mount();
    expect(rowIds("row")).toEqual(["1", "4"]);
    toggleOf(rowById("1")).click();
    await settle();
    expect(rowIds("row")).toEqual(["1", "2", "4"]);
    expect(
      rowById("2").querySelector('[data-adapttable-part="tree-cell"]')
    ).not.toBeNull();
  });

  it("draws the rows flat when no hierarchy is given", async () => {
    features = [tree<Person>()];
    await mount();
    expect(rowIds("row")).toEqual(["1", "4"]);
    expect(parts("tree-cell")).toEqual([]);
  });

  it("walks the tree but draws each cell plain when no kit fills the tree cell", async () => {
    features = [bindingTree<Person>({ getChildren: (row) => row.reports })];
    await mount();
    expect(rowIds("row")).toEqual(["1", "4"]);
    expect(parts("tree-cell")).toEqual([]);
    expect(rowById("1").textContent).toContain("Ada");
  });
});
