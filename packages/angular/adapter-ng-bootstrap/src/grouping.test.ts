/**
 * Grouping through the unstyled table — headers with counts and subtotals,
 * collapsing, dragging a column into the panel, and a windowed grouped body.
 */
import type { AdaptTableFeature, ColumnDef } from "@adapttable/angular";
import { grouping } from "@adapttable/ng-bootstrap/grouping";
import { groupingPanel } from "@adapttable/ng-bootstrap/grouping-panel";
import { virtualize } from "@adapttable/ng-bootstrap/virtualize";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { ngBootstrapPart } from "../testUtils";
import { AdaptDataTable } from "./dataTable";

interface Task {
  id: string;
  title: string;
  team: string;
  points: number;
}

const ROWS: Task[] = [
  { id: "1", title: "Ship", team: "Core", points: 3 },
  { id: "2", title: "Test", team: "Web", points: 5 },
  { id: "3", title: "Plan", team: "Core", points: 2 },
  { id: "4", title: "Fix", team: "Core", points: 4 },
  { id: "5", title: "Demo", team: "Web", points: 1 },
];

const COLS: ColumnDef<Task>[] = [
  { key: "title", header: "Title", accessor: (r) => r.title },
  { key: "team", header: "Team", accessor: (r) => r.team },
  { key: "points", header: "Points", accessor: (r) => r.points },
];

const sumPoints = (rows: readonly Task[]) => ({
  points: rows.reduce((total, row) => total + row.points, 0),
});

@Component({
  imports: [AdaptDataTable],
  template: `
    <adapt-data-table
      [data]="data()"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile()"
      [dir]="direction()"
      [paginationMode]="paginationMode()"
      [maxHeight]="maxHeight()"
      [selectable]="selectable()"
      [features]="features()"
    />
  `,
})
class Host {
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly data = input<readonly Task[]>(ROWS);
  readonly mobile = input<boolean | undefined>(undefined);
  readonly direction = input<"ltr" | "rtl">("ltr");
  readonly paginationMode = input<"paged" | "infinite">("paged");
  readonly maxHeight = input<number | undefined>(undefined);
  readonly selectable = input(false);
  readonly columns = COLS;
  readonly rowKey = (row: Task) => row.id;
}

async function mount(
  features: readonly AdaptTableFeature[],
  inputs: Partial<{
    data: readonly Task[];
    mobile: boolean;
    direction: "ltr" | "rtl";
    paginationMode: "paged" | "infinite";
    maxHeight: number;
    selectable: boolean;
  }> = {}
) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", features);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return () => fixture.whenStable();
}

function all(name: string, root: ParentNode = document): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(ngBootstrapPart(name))];
}

function texts(name: string, root: ParentNode = document): string[] {
  return all(name, root).map((element) => element.textContent.trim());
}

/** The body's rows as `group:<label>` or the row's title, in order. */
function bodyOrder(): string[] {
  const body = all("tbody")[0]!;
  return [...body.children].map((row) =>
    row.getAttribute("data-adapttable-part") === "group-row"
      ? `group:${texts("group-label", row)[0]!}`
      : row.querySelector("td[data-adapttable-part='cell']")!.textContent.trim()
  );
}

/** A native drag event carrying a fake `DataTransfer`. */
function dragEvent(type: string, transfer: FakeTransfer): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: transfer });
  return event;
}

class FakeTransfer {
  private readonly data = new Map<string, string>();
  effectAllowed = "";
  dropEffect = "";
  get types(): string[] {
    return [...this.data.keys()];
  }
  setData(type: string, value: string): void {
    this.data.set(type, value);
  }
  getData(type: string): string {
    return this.data.get(type) ?? "";
  }
}

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute("dir");
});

describe("grouping (unstyled Angular)", () => {
  it("draws one header per group with its count and subtotal, rows beneath", async () => {
    await mount([grouping<Task>("team", { groupAggregates: sumPoints })]);
    expect(texts("group-label")).toEqual(["Core", "Web"]);
    expect(texts("group-count")).toEqual(["(3)", "(2)"]);
    const subtotals = all("group-aggregate");
    expect(subtotals.map((cell) => cell.getAttribute("data-column"))).toEqual([
      "points",
      "points",
    ]);
    expect(subtotals.map((cell) => cell.textContent.trim())).toEqual([
      "9",
      "6",
    ]);
    expect(bodyOrder()).toEqual([
      "group:Core",
      "Ship",
      "Plan",
      "Fix",
      "group:Web",
      "Test",
      "Demo",
    ]);
  });

  it("shows every filtered row on one page while grouped", async () => {
    const many: Task[] = Array.from({ length: 30 }, (_, index) => ({
      id: String(index),
      title: `Task ${String(index)}`,
      team: index < 12 ? "Core" : "Web",
      points: 1,
    }));
    await mount([], { data: many });
    expect(all("cell").length / COLS.length).toBe(25);
    expect(texts("page-number")).toEqual(["1", "2"]);
    document.body.replaceChildren();

    await mount([grouping("team")], { data: many });
    expect(all("cell").length / COLS.length).toBe(30);
    expect(texts("group-count")).toEqual(["(12)", "(18)"]);
    expect(texts("page-number")).toEqual(["1"]);
  });

  it.each([
    [false, "ltr"],
    [false, "rtl"],
    [true, "ltr"],
    [true, "rtl"],
  ] as const)(
    "points closed groups into the row and open groups down (mobile=%s, dir=%s)",
    async (mobile, direction) => {
      document.body.setAttribute("dir", "rtl");
      const settle = await mount([grouping("team")], { mobile, direction });
      const toggle = () => all("group-toggle")[0]!;
      const wrapper = () =>
        toggle().querySelector<HTMLElement>(".group-chevron")!;
      const icon = () => toggle().querySelector<SVGElement>("svg")!;
      const rowPart = mobile ? "card" : "row";
      expect(all(rowPart)).toHaveLength(5);
      expect(toggle().getAttribute("aria-label")).toBe("Collapse group");
      expect(icon().getAttribute("aria-hidden")).toBe("true");
      expect(icon().style.transform).toBe("rotate(90deg)");
      expect(getComputedStyle(wrapper()).transform === "scaleX(-1)").toBe(
        direction === "rtl"
      );
      toggle().click();
      await settle();
      expect(toggle().getAttribute("aria-label")).toBe("Expand group");
      expect(toggle().getAttribute("aria-expanded")).toBe("false");
      expect(icon().style.transform).toBe("");
      expect(getComputedStyle(wrapper()).transform === "scaleX(-1)").toBe(
        direction === "rtl"
      );
      expect(all(rowPart)).toHaveLength(2);
      toggle().click();
      await settle();
      expect(icon().style.transform).toBe("rotate(90deg)");
      expect(all(rowPart)).toHaveLength(5);
    }
  );

  it("hides a group's rows when it collapses and brings them back", async () => {
    const settle = await mount([grouping("team")]);
    const toggle = all("group-toggle")[0]!;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-label")).toBe("Collapse group");

    toggle.click();
    await settle();
    expect(bodyOrder()).toEqual(["group:Core", "group:Web", "Test", "Demo"]);
    const collapsed = all("group-toggle")[0]!;
    expect(collapsed.getAttribute("aria-expanded")).toBe("false");
    expect(collapsed.getAttribute("aria-label")).toBe("Expand group");
    expect(all("group-row")[0]!.getAttribute("data-collapsed")).toBe("true");

    collapsed.click();
    await settle();
    expect(bodyOrder()).toEqual([
      "group:Core",
      "Ship",
      "Plan",
      "Fix",
      "group:Web",
      "Test",
      "Demo",
    ]);
  });

  it("closes each group with a footer carrying its subtotal", async () => {
    await mount([
      grouping<Task>("team", {
        groupAggregates: sumPoints,
        groupFooters: true,
      }),
    ]);
    const footers = all("group-footer-row");
    expect(footers.map((row) => texts("group-label", row)[0])).toEqual([
      "Core total",
      "Web total",
    ]);
    expect(footers.map((row) => texts("group-aggregate", row)[0])).toEqual([
      "9",
      "6",
    ]);
    expect(all("group-toggle-spacer", footers[0])).toHaveLength(2);
    expect(all("group-toggle", footers[0])).toHaveLength(0);
  });

  it("reveals more groups a page at a time", async () => {
    const settle = await mount([grouping("team", { groupPageSize: 1 })]);
    expect(texts("group-label")).toEqual(["Core"]);
    const more = all("group-more")[0]!;
    expect(more.textContent.trim()).toBe("Show 1 more groups");
    expect(all("group-more-row")).toHaveLength(1);
    more.click();
    await settle();
    expect(texts("group-label")).toEqual(["Core", "Web"]);
    expect(all("group-more")).toHaveLength(0);
  });

  it("selects a group's rows from its header checkbox", async () => {
    const settle = await mount([grouping("team")], { selectable: true });
    const [core] = all("group-select") as HTMLInputElement[];
    expect(core!.getAttribute("aria-label")).toBe("Select all");
    core!.click();
    await settle();
    const rowBoxes = all("checkbox").filter(
      (box) => box.closest("[data-adapttable-part='selection-cell']") !== null
    ) as HTMLInputElement[];
    expect(rowBoxes.map((box) => box.checked)).toEqual([
      true,
      true,
      true,
      false,
      false,
    ]);
    expect((all("group-select")[0] as HTMLInputElement).checked).toBe(true);
    expect((all("group-select")[1] as HTMLInputElement).checked).toBe(false);
  });

  it("groups phone cards under header cards", async () => {
    const settle = await mount([grouping("team")], { mobile: true });
    expect(texts("group-label")).toEqual(["Core", "Web"]);
    expect(all("group-card")).toHaveLength(2);
    expect(all("card")).toHaveLength(5);
    all("group-toggle")[1]!.click();
    await settle();
    expect(all("card")).toHaveLength(3);
  });

  it("groups by a column dragged from its header into the panel", async () => {
    const settle = await mount([groupingPanel()]);
    expect(all("group-row")).toHaveLength(0);
    const teamHeader = all("header-cell")[1]!;
    expect(teamHeader.getAttribute("draggable")).toBe("true");

    const transfer = new FakeTransfer();
    teamHeader.dispatchEvent(dragEvent("dragstart", transfer));
    await settle();
    const zone = all("grouping-drop-zone")[0]!;
    zone.dispatchEvent(dragEvent("dragover", transfer));
    zone.dispatchEvent(dragEvent("drop", transfer));
    await settle();

    expect(texts("grouping-chip")).toEqual([expect.stringContaining("Team")]);
    expect(texts("group-label")).toEqual(["Core", "Web"]);
  });

  it("windows a grouped body over its headers and rows", async () => {
    const many: Task[] = Array.from({ length: 40 }, (_, index) => ({
      id: String(index),
      title: `Task ${String(index)}`,
      team: index % 2 === 0 ? "Core" : "Web",
      points: 1,
    }));
    await mount([grouping("team"), virtualize({ estimateRowSize: 40 })], {
      data: many,
      paginationMode: "infinite",
      maxHeight: 200,
    });
    // jsdom lays nothing out, so the window holds no entry yet: the spacer
    // stands in for every entry — both headers and all forty rows — at the
    // estimated size, where a flat window would count rows alone.
    expect(all("group-row")).toHaveLength(0);
    const spacer = all("virtual-spacer");
    expect(spacer).toHaveLength(1);
    expect(spacer[0]!.querySelector("td")!.style.height).toBe(
      `${String((40 + 2) * 40)}px`
    );
  });
});
