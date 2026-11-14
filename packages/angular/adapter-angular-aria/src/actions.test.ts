import type {
  AdaptTableFeature,
  BulkAction,
  ColumnDef,
  ConfirmHandler,
  RowAction,
} from "@adapttable/angular";
import { bulkActions } from "@adapttable/angular-aria/bulk-actions";
import { columnMenu } from "@adapttable/angular-aria/column-menu";
import { rowActions } from "@adapttable/angular-aria/row-actions";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { actionsTests } from "../../angular/test/kit/suites/actions";
import { kit } from "../testing/kit";
import { AdaptDataTable } from "./dataTable";

for (const test of actionsTests(kit)) it(test.name, test.run);

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

async function mount(features: readonly AdaptTableFeature[], mobile = false) {
  const fixture = TestBed.createComponent(Host);
  fixture.componentRef.setInput("features", features);
  fixture.componentRef.setInput("mobile", mobile);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  document.body.append(element);
  const part = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) => root.querySelector<T>(`[data-adapttable-part="${name}"]`);
  const parts = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) => [...root.querySelectorAll<T>(`[data-adapttable-part="${name}"]`)];
  return { fixture, element, part, parts, settle: () => fixture.whenStable() };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the Angular Aria Angular bulk actions", () => {
  it("makes rows selectable and shows the bar while any is selected", async () => {
    const archived: string[][] = [];
    const actions: BulkAction[] = [
      {
        key: "archive",
        label: "Archive",
        onClick: (ids) => {
          archived.push(ids);
        },
      },
      {
        key: "locked",
        label: "Locked",
        disabledReason: () => "Not now",
        onClick: () => undefined,
      },
    ];
    const { part, parts, settle } = await mount([bulkActions(actions)]);
    expect(part("bulk-bar")).toBeNull();
    parts<HTMLInputElement>("checkbox")[1]!.click();
    await settle();
    expect(part("bulk-bar")?.querySelector("output")?.textContent).toContain(
      "1"
    );
    const [archive, locked] = parts<HTMLButtonElement>("bulk-button");
    expect(locked?.disabled).toBe(true);
    expect(locked?.title).toBe("Not now");
    archive!.click();
    await settle();
    expect(archived).toEqual([["1"]]);
    // A successful run clears the selection.
    expect(part("bulk-bar")).toBeNull();
  });

  it("clears the selection from the bar, and says when an action fails", async () => {
    const { part, parts, settle } = await mount([
      bulkActions([
        {
          key: "fail",
          label: "Fail",
          onClick: () => Promise.reject(new Error("Nope")),
        },
      ]),
    ]);
    parts<HTMLInputElement>("checkbox")[1]!.click();
    await settle();
    parts<HTMLButtonElement>("bulk-button")[0]!.click();
    await settle();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle();
    expect(part("bulk-error")?.textContent).toContain("Nope");
    part("bulk-bar")?.querySelector<HTMLButtonElement>("button")!.click();
    await settle();
    expect(part("bulk-bar")).toBeNull();
  });
});

describe("the Angular Aria Angular row actions", () => {
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

  it("puts the actions behind one button in the menu layout", async () => {
    const { part, parts, settle } = await mount([
      rowActions(actions, { layout: "menu" }),
    ]);
    const menu = part<HTMLDetailsElement>("row-actions-menu");
    expect(menu).not.toBeNull();
    if (!menu) throw new Error("menu is not rendered");
    menu.open = true;
    parts<HTMLButtonElement>("action-button", menu)[0]!.click();
    await settle();
    expect(edits).toEqual(["1"]);
    expect(menu.open).toBe(false);
  });

  it("lists the actions column in the Columns menu, and hides it", async () => {
    const { part, parts, settle } = await mount([
      rowActions(actions),
      columnMenu(),
    ]);
    part<HTMLButtonElement>("column-menu-button")!.click();
    await settle();
    const edge = parts("column-menu-item").find((item) =>
      item.hasAttribute("data-actions")
    );
    expect(edge).not.toBeUndefined();
    part<HTMLButtonElement>("column-menu-pin", edge)!.click();
    await settle();
    expect(
      parts("column-menu-item")
        .find((item) => item.hasAttribute("data-actions"))
        ?.getAttribute("data-pinned")
    ).toBe("end");
    part<HTMLButtonElement>("column-menu-visibility", edge)!.click();
    await settle();
    expect(part("actions-header")).toBeNull();
  });
});
