import type {
  AdaptTableFeature,
  BulkAction,
  ColumnDef,
  ConfirmHandler,
  RowAction,
} from "@adapttable/angular";
import { bulkActions } from "@adapttable/ng-zorro/bulk-actions";
import { columnMenu } from "@adapttable/ng-zorro/column-menu";
import { rowActions } from "@adapttable/ng-zorro/row-actions";
import { Component, input } from "@angular/core";
import { TestBed } from "@angular/core/testing";

import { kitSelector } from "../testUtils";
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
  ) => root.querySelector<T>(kitSelector(name));
  const parts = <T extends HTMLElement>(
    name: string,
    root: ParentNode = element
  ) => [...root.querySelectorAll<T>(kitSelector(name))];
  return { fixture, element, part, parts, settle: () => fixture.whenStable() };
}

function pressKey(element: HTMLElement, key: string, shiftKey = false) {
  const event = new KeyboardEvent("keydown", {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
  return event;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the NG-ZORRO Angular bulk actions", () => {
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
    expect(archive?.classList.contains("ant-btn")).toBe(true);
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

  it("keeps the all-matching selection fixed while a kit bulk action is pending", async () => {
    let finish: (() => void) | undefined;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const run = vi.fn(() => pending);
    const { part, parts, settle } = await mount([
      bulkActions([{ key: "archive", label: "Archive", onClick: run }]),
    ]);
    part<HTMLInputElement>("checkbox")!.click();
    await settle();
    part<HTMLButtonElement>("select-all-button")!.click();
    await settle();
    parts<HTMLButtonElement>("bulk-button")[0]!.click();
    await settle();
    expect(run).toHaveBeenCalledExactlyOnceWith(["1", "2", "3", "4", "5"], {
      allMatching: true,
      total: 12,
    });
    const clearMatching = part<HTMLButtonElement>("select-all-button")!;
    expect(clearMatching.classList.contains("ant-btn")).toBe(true);
    expect(clearMatching.disabled).toBe(true);
    clearMatching.click();
    await settle();
    expect(part("select-all-text")?.textContent).toContain("12");
    expect(parts<HTMLButtonElement>("bulk-button")[0]!.disabled).toBe(true);
    expect(finish).toBeTypeOf("function");
    finish!();
    await settle();
    await vi.waitFor(() => expect(part("bulk-bar")).toBeNull());
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
    expect(part("bulk-error")?.tagName).toBe("NZ-ALERT");
    part("bulk-bar")?.querySelector<HTMLButtonElement>("button")!.click();
    await settle();
    expect(part("bulk-bar")).toBeNull();
  });
});

describe("the NG-ZORRO Angular row actions", () => {
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

  it("puts the actions behind a real NG-ZORRO dropdown and closes after choosing", async () => {
    const { part, parts, settle } = await mount([
      rowActions(actions, { layout: "menu" }),
    ]);
    const trigger = part<HTMLButtonElement>("row-actions-trigger")!;
    expect(trigger.classList.contains("ant-btn")).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(part("row-actions-menu", document)).toBeNull();
    trigger.click();
    await settle();
    await vi.waitFor(() =>
      expect(part("row-actions-menu", document)).not.toBeNull()
    );
    const menu = part("row-actions-menu", document)!;
    expect(menu.classList.contains("ant-dropdown-menu")).toBe(true);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const buttons = parts<HTMLButtonElement>("action-button", menu);
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      "Edit",
      "Blocked",
    ]);
    expect(buttons[1]!.disabled).toBe(true);
    buttons[0]!.click();
    await settle();
    expect(edits).toEqual(["1"]);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens the menu from its keyboard trigger and restores focus on Escape", async () => {
    const { part, settle } = await mount([
      rowActions(actions, { layout: "menu" }),
    ]);
    const trigger = part<HTMLButtonElement>("row-actions-trigger")!;
    trigger.focus();
    trigger.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    await vi.waitFor(() =>
      expect(part("row-actions-menu", document)).not.toBeNull()
    );
    const menu = part("row-actions-menu", document)!;
    const edit = menu.querySelector<HTMLButtonElement>(
      'button[role="menuitem"]'
    )!;
    expect(document.activeElement).toBe(edit);
    edit.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      })
    );
    expect(document.activeElement).toBe(edit);
    edit.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      })
    );
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    expect(edits).toEqual([]);
  });

  it("opens at the last enabled action and wraps keyboard navigation past disabled actions", async () => {
    const run = vi.fn();
    const { part, parts, settle } = await mount([
      rowActions<Person>(
        [
          { key: "first", label: "First", onClick: run },
          {
            key: "blocked",
            label: "Blocked",
            isDisabled: () => true,
            onClick: run,
          },
          { key: "last", label: "Last", onClick: run },
        ],
        { layout: "menu" }
      ),
    ]);
    const trigger = part<HTMLButtonElement>("row-actions-trigger")!;
    trigger.focus();
    expect(pressKey(trigger, "F2").defaultPrevented).toBe(false);
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(part("row-actions-menu", document)).toBeNull();
    expect(document.activeElement).toBe(trigger);

    expect(pressKey(trigger, "ArrowUp").defaultPrevented).toBe(true);
    await settle();
    await vi.waitFor(() => {
      const menu = part("row-actions-menu", document);
      expect(menu).not.toBeNull();
      expect(document.activeElement).toBe(
        parts<HTMLButtonElement>("action-button", menu!)[2]
      );
    });
    const menu = part("row-actions-menu", document)!;
    const [first, blocked, last] = parts<HTMLButtonElement>(
      "action-button",
      menu
    );
    expect(blocked!.disabled).toBe(true);
    expect(pressKey(last!, "ArrowDown").defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
    pressKey(first!, "ArrowUp");
    expect(document.activeElement).toBe(last);
    pressKey(last!, "Home");
    expect(document.activeElement).toBe(first);
    pressKey(first!, "End");
    expect(document.activeElement).toBe(last);
    expect(pressKey(last!, "F2").defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(last);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(run).not.toHaveBeenCalled();

    trigger.focus();
    expect(pressKey(trigger, "Escape").defaultPrevented).toBe(true);
    await settle();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });

  it.each([false, true])(
    "dismisses the menu on Tab without preventing native traversal, shift=%s",
    async (shiftKey) => {
      const { part, settle } = await mount([
        rowActions(actions, { layout: "menu" }),
      ]);
      const trigger = part<HTMLButtonElement>("row-actions-trigger")!;
      trigger.focus();
      pressKey(trigger, "ArrowDown");
      await settle();
      await vi.waitFor(() =>
        expect(part("row-actions-menu", document)).not.toBeNull()
      );
      const item = part<HTMLButtonElement>(
        "action-button",
        part("row-actions-menu", document)!
      )!;
      expect(document.activeElement).toBe(item);
      expect(pressKey(item, "Tab", shiftKey).defaultPrevented).toBe(false);
      await settle();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(trigger);
      expect(edits).toEqual([]);
    }
  );

  it.each(["disabled", "hidden"] as const)(
    "keeps focus on the trigger when every action is %s",
    async (state) => {
      const run = vi.fn();
      const { part, parts, settle } = await mount([
        rowActions<Person>(
          [
            {
              key: "unavailable",
              label: "Unavailable",
              isDisabled: () => state === "disabled",
              isHidden: () => state === "hidden",
              onClick: run,
            },
          ],
          { layout: "menu" }
        ),
      ]);
      const trigger = part<HTMLButtonElement>("row-actions-trigger")!;
      trigger.focus();
      pressKey(trigger, "ArrowUp");
      await settle();
      await vi.waitFor(() =>
        expect(part("row-actions-menu", document)).not.toBeNull()
      );
      const menu = part("row-actions-menu", document)!;
      const buttons = parts<HTMLButtonElement>("action-button", menu);
      expect(buttons).toHaveLength(state === "disabled" ? 1 : 0);
      expect(buttons.filter((button) => !button.disabled)).toHaveLength(0);
      expect(document.activeElement).toBe(trigger);
      expect(pressKey(menu, "Home").defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(trigger);
      expect(run).not.toHaveBeenCalled();
      pressKey(trigger, "Escape");
      await settle();
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(trigger);
    }
  );

  it.each(["reason", "predicate"] as const)(
    "rechecks a host's changed disabled %s before invoking an action",
    async (guard) => {
      let allowed = true;
      const run = vi.fn();
      const { part, settle } = await mount([
        rowActions<Person>([
          {
            key: "restricted",
            label: "Restricted",
            disabledReason: () =>
              guard === "reason" && !allowed ? "Permission revoked" : undefined,
            isDisabled: () => guard === "predicate" && !allowed,
            onClick: run,
          },
        ]),
      ]);
      const action = part<HTMLButtonElement>("action-button")!;
      expect(action.disabled).toBe(false);
      // Host permissions may change between rendering and the next user click.
      allowed = false;
      action.click();
      await settle();
      expect(run).not.toHaveBeenCalled();
      allowed = true;
      action.click();
      await settle();
      expect(run).toHaveBeenCalledExactlyOnceWith(PEOPLE[0]);
    }
  );

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
    const edge = parts("column-menu-item", document).find((item) =>
      item.hasAttribute("data-actions")
    );
    expect(edge).not.toBeUndefined();
    part<HTMLButtonElement>("column-menu-pin", edge)!.click();
    await settle();
    expect(
      parts("column-menu-item", document)
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
