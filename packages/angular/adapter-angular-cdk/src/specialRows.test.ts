/**
 * Spanning and special rows through the unstyled table: merged cells, the
 * separator and full-width rows between data rows, and each row's own
 * class, style and height — on the table and the phone cards.
 */
import type { AdaptTableFeature, ColumnInput } from "@adapttable/angular";
import { cellSpan } from "@adapttable/angular-cdk/cell-span";
import { extraRows } from "@adapttable/angular-cdk/extra-rows";
import { rowAppearance } from "@adapttable/angular-cdk/row-appearance";
import {
  ChangeDetectionStrategy,
  Component,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { AdaptDataTable } from "./dataTable";

interface Person {
  id: string;
  name: string;
  team: string;
  city: string;
}

const PEOPLE: Person[] = [
  { id: "1", name: "Ada", team: "Core", city: "London" },
  { id: "2", name: "Grace", team: "Core", city: "New York" },
  { id: "3", name: "Linus", team: "Kernel", city: "Portland" },
];

const COLUMNS: ColumnInput<Person>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "team", header: "Team", accessor: (row) => row.team },
  { key: "city", header: "City", accessor: (row) => row.city },
];

// Team merges down a run of equal teams.
const teamRuns = cellSpan<Person>(
  ({ column, sectionRows, sectionRowIndex }) => {
    if (column.key !== "team") return undefined;
    const team = sectionRows[sectionRowIndex]!.team;
    if (sectionRows[sectionRowIndex - 1]?.team === team) return undefined;
    let rowSpan = 1;
    while (sectionRows[sectionRowIndex + rowSpan]?.team === team) rowSpan += 1;
    return { rowSpan };
  }
);

@Component({
  selector: "test-banner",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<strong>Kernel team</strong>`,
})
class Banner {}

let features: AdaptTableFeature[] = [];
// Reads the mounted host's note template once change detection has built it.
let note: (() => TemplateRef<unknown>) | undefined;
let mobile = false;

@Component({
  imports: [AdaptDataTable],
  template: `
    <ng-template #note><em>Core team</em></ng-template>
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      [urlSync]="false"
      [forceMobile]="mobile"
      [features]="features"
    />
  `,
})
class Host {
  readonly rows = PEOPLE;
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
  readonly features = features;
  readonly mobile = mobile;
  readonly note = viewChild.required<TemplateRef<unknown>>("note");
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  note = () => fixture.componentInstance.note();
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return fixture;
}

const parts = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(`[data-adapttable-part="${name}"]`),
];
// The one element named `name`; a missing one fails the test.
const only = (name: string, index = 0): HTMLElement => {
  const element = parts(name)[index];
  if (element === undefined) throw new Error(`no ${name} at ${index}`);
  return element;
};
const rowTexts = () =>
  parts("row").map((row) =>
    parts("cell", row).map((cell) => cell.textContent.trim())
  );

afterEach(() => {
  document.body.replaceChildren();
  features = [];
  mobile = false;
  note = undefined;
});

describe("the unstyled table's merged cells", () => {
  it("draws a run of equal teams as one cell spanning its rows", async () => {
    features = [teamRuns];
    await mount();
    expect(rowTexts()).toEqual([
      ["Ada", "Core", "London"],
      ["Grace", "New York"],
      ["Linus", "Kernel", "Portland"],
    ]);
    const merged = parts("cell", only("row", 0))[1]!;
    expect(merged.getAttribute("rowspan")).toBe("2");
    expect(merged.hasAttribute("colspan")).toBe(false);
    expect(merged.getAttribute("data-cell-span")).toBe("1x2");
    expect(merged.style.textAlign).toBe("center");
    expect(merged.style.verticalAlign).toBe("middle");
    expect(merged.style.background).toContain("--adapttable-cell-span-fill");
    const single = parts("cell", only("row", 2))[1]!;
    expect(single.hasAttribute("rowspan")).toBe(false);
    expect(single.hasAttribute("data-cell-span")).toBe(false);
  });

  it("keeps the span but not the paint when the look is plain", async () => {
    features = [
      cellSpan<Person>(
        ({ column, rowIndex }) =>
          column.key === "name" && rowIndex === 2 ? { colSpan: 2 } : undefined,
        "plain"
      ),
    ];
    await mount();
    expect(rowTexts()[2]).toEqual(["Linus", "Portland"]);
    const merged = parts("cell", only("row", 2))[0]!;
    expect(merged.getAttribute("colspan")).toBe("2");
    expect(merged.getAttribute("data-cell-span")).toBe("2x1");
    // The column's own alignment, with no merge wash over it.
    expect(merged.style.textAlign).toBe("start");
    expect(merged.style.background).toBe("");
  });
});

describe("the unstyled table's extra rows", () => {
  it("puts a named separator and full-width rows between the data rows", async () => {
    features = [
      extraRows([
        { key: "rule", kind: "separator", beforeRowId: "2" },
        {
          key: "note",
          kind: "fullWidth",
          beforeRowId: "1",
          render: () => note!(),
        },
        {
          key: "banner",
          kind: "fullWidth",
          beforeRowId: "3",
          render: () => Banner,
        },
        { key: "end", kind: "fullWidth", render: () => "3 people" },
      ]),
    ];
    await mount();

    const body = document.querySelector('[data-adapttable-part="tbody"]')!;
    expect(
      [...body.children].map((row) => row.getAttribute("data-adapttable-part"))
    ).toEqual([
      "full-width-row",
      "row",
      "separator-row",
      "row",
      "full-width-row",
      "row",
      "full-width-row",
    ]);
    const separator = parts("separator-cell")[0]!;
    expect(separator.hasAttribute("role")).toBe(false);
    const rule = separator.querySelector("hr");
    expect(rule).not.toBeNull();
    expect(rule!.getAttribute("aria-label")).toBe("Separator");
    expect(separator.getAttribute("colspan")).toBe("3");
    const wide = parts("full-width-cell");
    expect(wide.map((cell) => cell.getAttribute("colspan"))).toEqual([
      "3",
      "3",
      "3",
    ]);
    expect(wide[0]!.querySelector("em")?.textContent).toBe("Core team");
    expect(wide[1]!.querySelector("strong")?.textContent).toBe("Kernel team");
    expect(wide[2]!.textContent.trim()).toBe("3 people");
    expect(wide[0]!.hasAttribute("role")).toBe(false);
  });

  it("paints an extra row with the fill of the row it sits before", async () => {
    features = [
      extraRows([{ key: "rule", kind: "separator", beforeRowId: "2" }]),
      rowAppearance<Person>({
        rowStyle: (row) =>
          row.id === "2" ? { backgroundColor: "rgb(255, 0, 0)" } : undefined,
      }),
    ];
    await mount();
    expect(parts("separator-cell")[0]!.style.backgroundColor).toBe(
      "rgb(255, 0, 0)"
    );
  });

  it("puts the same rows between the phone cards", async () => {
    mobile = true;
    features = [
      extraRows([
        { key: "rule", kind: "separator", beforeRowId: "2" },
        { key: "end", kind: "fullWidth", render: () => "3 people" },
      ]),
    ];
    await mount();
    const list = parts("cards")[0]!;
    expect(
      [...list.children].map((item) =>
        item.getAttribute("data-adapttable-part")
      )
    ).toEqual(["card", "separator-row", "card", "card", "full-width-row"]);
    const separator = parts("separator-row")[0]!;
    expect(separator.hasAttribute("role")).toBe(false);
    const rule = separator.querySelector("hr");
    expect(rule).not.toBeNull();
    expect(rule!.getAttribute("aria-label")).toBe("Separator");
    expect(parts("full-width-cell")[0]!.textContent.trim()).toBe("3 people");
  });
});

describe("the unstyled table's row appearance", () => {
  const appearance = rowAppearance<Person>({
    rowClassName: (row) => (row.team === "Kernel" ? "is-kernel" : undefined),
    rowStyle: (_row, index) =>
      index === 0 ? { fontWeight: "bold" } : undefined,
    rowHeight: (row) => (row.id === "2" ? 64 : 40),
  });

  it("gives each row its class, style and height", async () => {
    features = [appearance];
    await mount();
    const [first, second, third] = parts("row");
    expect(first!.style.fontWeight).toBe("bold");
    expect(first!.style.height).toBe("40px");
    expect(second!.style.height).toBe("64px");
    expect(second!.className).toBe("");
    expect(third!.className).toBe("is-kernel");
  });

  it("gives each phone card the same", async () => {
    mobile = true;
    features = [appearance];
    await mount();
    const [first, , third] = parts("card");
    expect(first!.style.fontWeight).toBe("bold");
    expect(first!.style.height).toBe("40px");
    expect(third!.className).toBe("is-kernel");
    expect(third!.style.display).toBe("block");
  });
});
