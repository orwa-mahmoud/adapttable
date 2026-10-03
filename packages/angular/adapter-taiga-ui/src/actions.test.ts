import {
  type AdaptTableFeature,
  type BulkAction,
  type ColumnDef,
  type ConfirmHandler,
  type RowAction,
} from "@adapttable/angular";
import { bulkActions } from "@adapttable/taiga-ui/bulk-actions";
import { columnMenu } from "@adapttable/taiga-ui/column-menu";
import { rowActions } from "@adapttable/taiga-ui/row-actions";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { AdaptDataTable } from "./dataTable";

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
  ) =>
    root.querySelector<T>(
      `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
    );
  const parts = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) => [
    ...root.querySelectorAll<T>(
      `:is([data-adapttable-part="${name}"], [data-taiga-part="${name}"])`
    ),
  ];
  return { fixture, element, part, parts, settle: () => fixture.whenStable() };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the Taiga UI Angular bulk actions", () => {
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

describe("the Taiga UI Angular row actions", () => {
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

  it("puts the actions on each phone card", async () => {
    const { parts } = await mount([rowActions(actions)], true);
    expect(parts("card-actions")).toHaveLength(5);
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
