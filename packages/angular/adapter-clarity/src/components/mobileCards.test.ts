/** Mobile-card parity: real host renderers, activation and live state. */
import {
  AdaptCellTemplate,
  type AdaptTableFeature,
  type ColumnDef,
  type ConfirmHandler,
  type DirtyEdits,
  injectChangedCellFlash,
  type MobileCardField,
  type RowAction,
  runRowAction,
  type TableLabels,
} from "@adapttable/angular";
import { cellNavigation } from "@adapttable/clarity/cell-navigation";
import { dirtyIndicators, editing } from "@adapttable/clarity/editing";
import { pinnedSummaryRows } from "@adapttable/clarity/pinned-summary-rows";
import { rowActions } from "@adapttable/clarity/row-actions";
import { rowAppearance } from "@adapttable/clarity/row-appearance";
import { rowDetail } from "@adapttable/clarity/row-detail";
import { rowReorder } from "@adapttable/clarity/row-reorder";
import { NgTemplateOutlet } from "@angular/common";
import { Component, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { kitPart } from "../../testUtils";
import { AdaptDataTable } from "../dataTable";
import type { DataTableClassNames } from "../types";

interface Person {
  id: string;
  name: string;
  budget: number;
}

const ROWS: Person[] = [
  { id: "1", name: "Ada", budget: 10 },
  { id: "2", name: "Grace", budget: 20 },
];
const COLUMNS: ColumnDef<Person>[] = [
  { key: "name", header: "Name", mobileLabel: "", accessor: (row) => row.name },
  {
    key: "budget",
    header: "Budget",
    accessor: (row) => row.budget,
    editable: true,
    editor: "number",
  },
];

@Component({
  selector: "test-card-body",
  imports: [NgTemplateOutlet],
  template: `
    <strong class="component-name">{{ row().name }}</strong>
    <span class="component-state"
      >{{ index() }}:{{ selected() }}:{{ expanded() }}</span
    >
    @for (field of fields(); track field.column.key) {
      <div class="custom-field">
        <span>{{ field.label }}</span>
        <ng-container
          [ngTemplateOutlet]="field.value"
          [ngTemplateOutletContext]="field.context"
        />
      </div>
    }
  `,
})
class CardBody {
  readonly row = input.required<Person>();
  readonly fields = input.required<readonly MobileCardField<Person>[]>();
  readonly index = input.required<number>();
  readonly selected = input.required<boolean>();
  readonly expanded = input.required<boolean>();
}

@Component({
  selector: "test-row-actions",
  template: `
    @for (action of actions(); track action.key) {
      <button class="component-action" type="button" (click)="run(action)">
        {{ labels().rowActionsMenu }}: {{ row().name }}
      </button>
    }
  `,
})
class ActionsBody {
  readonly row = input.required<Person>();
  readonly actions = input.required<readonly RowAction<Person>[]>();
  readonly confirm = input.required<ConfirmHandler>();
  readonly labels = input.required<Required<TableLabels>>();
  run(action: RowAction<Person>): void {
    runRowAction(action, this.row(), this.confirm(), this.labels().cancel);
  }
}

@Component({
  selector: "test-card-detail",
  template: `<p class="detail-content">Details for {{ row().name }}</p>`,
})
class Detail {
  readonly row = input.required<Person>();
}

@Component({
  imports: [AdaptDataTable, AdaptCellTemplate, NgTemplateOutlet],
  template: `
    <ng-template
      #card
      let-row
      let-fields="fields"
      let-selected="selected"
      let-expanded="expanded"
      let-index="index"
    >
      <h3 class="custom-name">{{ row.name }}</h3>
      <span class="custom-state"
        >{{ index }}:{{ selected }}:{{ expanded }}</span
      >
      @for (field of fields; track field.column.key) {
        <div class="custom-field">
          <span>{{ field.label }}</span>
          <ng-container
            [ngTemplateOutlet]="field.value"
            [ngTemplateOutletContext]="field.context"
          />
        </div>
      }
    </ng-template>
    <ng-template
      #actions
      let-row
      let-actions="actions"
      let-confirm="confirm"
      let-labels="labels"
    >
      @for (action of actions; track action.key) {
        <button
          class="custom-action"
          type="button"
          (click)="run(action, row, confirm, labels.cancel)"
        >
          {{ labels.rowActionsMenu }}: {{ row.name }}
        </button>
      }
    </ng-template>
    <adapt-data-table
      [data]="rows()"
      [columns]="columns"
      [rowKey]="rowKey"
      [tableLabel]="tableLabel()"
      [labels]="labels()"
      [dir]="dir()"
      [urlSync]="false"
      [forceMobile]="mobile()"
      [selectable]="selectable()"
      [maxHeight]="maxHeight()"
      [features]="features()"
      [classNames]="classes()"
      [renderCard]="
        bodyKind() === 'template'
          ? card
          : bodyKind() === 'component'
            ? cardBody
            : undefined
      "
      [renderRowActions]="
        actionsKind() === 'template'
          ? actions
          : actionsKind() === 'component'
            ? actionsBody
            : undefined
      "
      [onRowClick]="activate()"
      [isCellFlashing]="flash.isFlashing"
      [confirm]="confirm()"
      [summaryRow]="summary()"
    >
      <ng-template adaptCellTemplate="name" let-value="value"
        ><em class="name-cell">{{ value }}</em></ng-template
      >
      <ng-template adaptCellTemplate="budget" let-value="value"
        ><strong class="budget-cell">{{ value }}</strong></ng-template
      >
    </adapt-data-table>
  `,
})
class Host {
  readonly rows = signal<readonly Person[]>(ROWS);
  readonly columns = COLUMNS;
  readonly rowKey = (row: Person) => row.id;
  readonly features = input<readonly AdaptTableFeature[]>([]);
  readonly mobile = input(true);
  readonly selectable = input(true);
  readonly maxHeight = input<number | string>();
  readonly bodyKind = input<"template" | "component">();
  readonly actionsKind = input<"template" | "component">();
  readonly summary = input<() => Partial<Record<string, unknown>>>();
  readonly activate = input<(row: Person) => void>();
  readonly confirm = input<ConfirmHandler>();
  readonly labels = signal<TableLabels>({});
  readonly tableLabel = signal("People on call");
  readonly dir = signal<"ltr" | "rtl">("rtl");
  readonly classes = signal<DataTableClassNames>({});
  readonly flash = injectChangedCellFlash({ enabled: true });
  readonly cardBody = CardBody;
  readonly actionsBody = ActionsBody;
  readonly run = runRowAction;
}

async function mount(
  options: {
    features?: readonly AdaptTableFeature[];
    mobile?: boolean;
    selectable?: boolean;
    maxHeight?: number | string;
    bodyKind?: "template" | "component";
    actionsKind?: "template" | "component";
    activate?: (row: Person) => void;
    confirm?: ConfirmHandler;
    summary?: () => Partial<Record<string, unknown>>;
  } = {}
) {
  const fixture = TestBed.createComponent(Host);
  for (const [name, value] of Object.entries(options))
    fixture.componentRef.setInput(name, value);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    fixture,
    host: fixture.componentInstance,
    settle: () => fixture.whenStable(),
  };
}

const parts = (name: string, root: ParentNode = document) => [
  ...root.querySelectorAll<HTMLElement>(kitPart(name)),
];
function part(name: string, root: ParentNode = document): HTMLElement {
  const result = parts(name, root)[0];
  if (!result) throw new Error(`Missing ${name}`);
  return result;
}
function element<T extends HTMLElement>(
  selector: string,
  root: ParentNode = document
): T {
  const result = root.querySelector<T>(selector);
  if (!result) throw new Error(`Missing ${selector}`);
  return result;
}
function key(target: HTMLElement, value: string): void {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: value,
      bubbles: true,
      cancelable: true,
    })
  );
}
async function editBudget(
  settle: () => Promise<unknown>,
  value: string
): Promise<void> {
  part("edit-cell-activate").dispatchEvent(
    new MouseEvent("dblclick", { bubbles: true })
  );
  await settle();
  const editor = element<HTMLInputElement>(
    '[data-adapttable-part="edit-cell-editor"]'
  );
  editor.value = value;
  editor.dispatchEvent(new Event("input"));
  key(editor, "Enter");
  await settle();
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("mobile card reach", () => {
  it("keeps handled row navigation outside the cell grid while cell arrows still navigate", async () => {
    const activate = vi.fn();
    const startEdit = vi.fn();
    const commit = vi.fn();
    const { settle } = await mount({
      mobile: false,
      activate,
      features: [cellNavigation(), editing(commit, { onEditStart: startEdit })],
    });
    const settleFrame = async (): Promise<void> => {
      await settle();
      await new Promise<void>((resolve) => {
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => {
            resolve();
          });
        } else {
          setTimeout(resolve, 0);
        }
      });
      await settle();
    };
    const [first, second] = parts("row");
    // Give the grid a real editable active cell before moving focus to a row.
    parts("cell", first)[1]!.focus();
    await settleFrame();
    first!.focus();
    key(first!, "ArrowDown");
    await settleFrame();
    expect(document.activeElement).toBe(second);
    expect(first!.tabIndex).toBe(-1);
    expect(second!.tabIndex).toBe(0);
    expect(activate).not.toHaveBeenCalled();
    key(second!, "Enter");
    await settleFrame();
    expect(document.activeElement).toBe(second);
    expect(activate).toHaveBeenCalledExactlyOnceWith(ROWS[1]);
    expect(startEdit).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    expect(parts("edit-cell-editor")).toHaveLength(0);

    const firstName = parts("cell", first)[0]!;
    const secondName = parts("cell", second)[0]!;
    firstName.focus();
    await settleFrame();
    key(firstName, "ArrowDown");
    await settleFrame();
    expect(document.activeElement).toBe(secondName);
    expect(secondName.getAttribute("tabindex")).toBe("0");
    expect(activate).toHaveBeenCalledExactlyOnceWith(ROWS[1]);
  });

  it("names the native list and updates its direction and name live", async () => {
    const { host, settle } = await mount();
    const list = part("cards");
    expect(list.tagName).toBe("UL");
    expect(list.getAttribute("aria-label")).toBe("People on call");
    expect(list.hasAttribute("role")).toBe(false);
    expect(list.getAttribute("dir")).toBe("rtl");
    host.dir.set("ltr");
    host.tableLabel.set("Available people");
    await settle();
    expect(list.getAttribute("dir")).toBe("ltr");
    expect(list.getAttribute("aria-label")).toBe("Available people");
  });

  it.each([280, "18rem", 0])(
    "makes the bounded native list keyboard-focusable for maxHeight=%s",
    async (maxHeight) => {
      const { fixture, settle } = await mount({ selectable: false });
      const list = part("cards");
      expect(list.hasAttribute("tabindex")).toBe(false);
      expect(list.tabIndex).toBe(-1);
      expect(list.style.overflowY).toBe("");
      expect(list.querySelector("button,input,[tabindex]")).toBeNull();

      fixture.componentRef.setInput("maxHeight", maxHeight);
      await settle();
      expect(part("cards")).toBe(list);
      expect(list.tagName).toBe("UL");
      expect(list.hasAttribute("role")).toBe(false);
      expect(list.getAttribute("aria-label")).toBe("People on call");
      expect(list.getAttribute("tabindex")).toBe("0");
      expect(list.style.maxHeight).toBe(
        typeof maxHeight === "number" ? `${String(maxHeight)}px` : maxHeight
      );
      expect(list.style.overflowY).toBe("auto");
      list.focus();
      expect(document.activeElement).toBe(list);

      fixture.componentRef.setInput("maxHeight", undefined);
      await settle();
      expect(part("cards")).toBe(list);
      expect(list.hasAttribute("tabindex")).toBe(false);
      expect(list.tabIndex).toBe(-1);
      expect(list.style.maxHeight).toBe("");
      expect(list.style.overflowY).toBe("");
    }
  );

  it("activates with Enter, Space and body clicks while roving past pinned summaries", async () => {
    const activate = vi.fn();
    const action = vi.fn();
    await mount({
      activate,
      features: [
        pinnedSummaryRows<Person>({
          top: [{ id: "total", name: "Total", budget: 30 }],
        }),
        rowActions([{ key: "inspect", label: "Inspect", onClick: action }]),
      ],
    });
    const [first, second] = parts("card");
    const summary = part("pinned-summary-top");
    expect([first!.tabIndex, second!.tabIndex]).toEqual([0, -1]);
    expect(summary.hasAttribute("tabindex")).toBe(false);
    expect(summary.hasAttribute("data-adapttable-row")).toBe(false);
    first!.focus();
    key(first!, "Enter");
    key(first!, " ");
    part("card-value", first).click();
    expect(activate.mock.calls).toEqual([[ROWS[0]], [ROWS[0]], [ROWS[0]]]);
    key(first!, "ArrowDown");
    expect(document.activeElement).toBe(second);
    expect([first!.tabIndex, second!.tabIndex]).toEqual([-1, 0]);
    key(second!, "ArrowUp");
    expect(document.activeElement).toBe(first);
    key(first!, "ArrowUp");
    expect(document.activeElement).toBe(first);
    part("checkbox", first).click();
    part("action-button", first).click();
    key(part("action-button", first), "Enter");
    summary.click();
    key(summary, "Enter");
    expect(activate).toHaveBeenCalledTimes(3);
    expect(action).toHaveBeenCalledExactlyOnceWith(ROWS[0]);
  });

  it.each(["template", "component"] as const)(
    "lays out real editable fields in a %s without losing the card shell",
    async (bodyKind) => {
      const save = vi.fn();
      const moved = vi.fn();
      const { settle } = await mount({
        bodyKind,
        features: [
          editing(save),
          rowDetail<Person>(Detail),
          rowReorder<Person>(moved),
        ],
      });
      const first = part("card");
      expect(element(".name-cell", first).textContent).toBe("Ada");
      expect(
        element(".budget-cell", part("edit-cell-activate", first)).textContent
      ).toBe("10");
      expect(element(".custom-field", first).textContent?.trim()).toBe("Ada");
      expect(parts("card-row", first)).toHaveLength(0);
      expect(
        element(
          `.${bodyKind === "template" ? "custom" : "component"}-state`,
          first
        ).textContent
      ).toBe("0:false:false");
      part("checkbox", first).click();
      part("expand-button", first).click();
      await settle();
      expect(first.hasAttribute("data-selected")).toBe(true);
      expect(
        element(
          `.${bodyKind === "template" ? "custom" : "component"}-state`,
          first
        ).textContent
      ).toBe("0:true:true");
      expect(part("card-detail", first).textContent?.trim()).toBe(
        "Details for Ada"
      );
      await editBudget(settle, "37");
      expect(save).toHaveBeenCalledExactlyOnceWith(ROWS[0], "budget", 37);
      expect(
        element(".budget-cell", part("edit-cell-activate", first)).textContent
      ).toBe("10");
      part("row-reorder-down", first).click();
      await settle();
      expect(moved).toHaveBeenCalledExactlyOnceWith(0, 1, ROWS[0]);
    }
  );

  it.each([true, false])(
    "passes host actions and their confirmation gate through custom renderers (mobile=%s)",
    async (mobile) => {
      const acted = vi.fn();
      const requests: Parameters<ConfirmHandler>[0][] = [];
      const { host, settle } = await mount({
        mobile,
        actionsKind: mobile ? "template" : "component",
        confirm: (request) => {
          requests.push(request);
        },
        features: [
          rowActions([
            {
              key: "archive",
              label: "Archive",
              confirm: {
                title: "Archive this person?",
                message: (row) => `Archive ${row.name}?`,
                confirmLabel: "Archive",
              },
              onClick: acted,
            },
          ]),
        ],
      });
      const button = element<HTMLButtonElement>(
        mobile ? ".custom-action" : ".component-action"
      );
      expect(button.textContent?.trim()).toBe("Row actions: Ada");
      button.click();
      await settle();
      expect(acted).not.toHaveBeenCalled();
      expect(requests.map((request) => request.title)).toEqual([
        "Archive this person?",
      ]);
      requests[0]!.onConfirm();
      expect(acted).toHaveBeenCalledExactlyOnceWith(ROWS[0]);
      host.labels.set({ rowActionsMenu: "Acciones" });
      await settle();
      expect(button.textContent?.trim()).toBe("Acciones: Ada");
    }
  );

  it("keeps pinned summary cards outside custom bodies, editors and actions", async () => {
    await mount({
      bodyKind: "template",
      actionsKind: "template",
      features: [
        editing(vi.fn()),
        pinnedSummaryRows<Person>({
          top: [{ id: "total", name: "Total", budget: 30 }],
        }),
        rowDetail<Person>(Detail),
        rowReorder<Person>(vi.fn()),
        rowActions([{ key: "inspect", label: "Inspect", onClick: vi.fn() }]),
      ],
    });
    const summary = part("pinned-summary-top");
    expect(
      parts("card-value", summary).map((node) => node.textContent?.trim())
    ).toEqual(["Total", "30"]);
    expect(
      summary.querySelectorAll("button,input,.custom-name,.custom-action")
    ).toHaveLength(0);
    expect(summary.getAttribute("aria-label")).toBe("Summary row");
  });

  it("marks exactly the changed card value and clears it through the live flash reader", async () => {
    const { host, settle, fixture } = await mount();
    host.flash.mark([
      {
        type: "update",
        id: "2",
        prev: ROWS[1]!,
        next: { ...ROWS[1]!, budget: 24 },
        index: 1,
      },
    ]);
    await settle();
    expect(
      [...document.querySelectorAll("[data-flash]")].map((node) =>
        node.textContent?.trim()
      )
    ).toEqual(["20"]);
    fixture.componentRef.setInput("mobile", false);
    await settle();
    const flashed = element("[data-flash]");
    expect(flashed.getAttribute("data-adapttable-part")).toBe("cell");
    expect(flashed.getAttribute("data-column-key")).toBe("budget");
    expect(flashed.textContent?.trim()).toBe("20");
    host.flash.clear();
    await settle();
    expect(document.querySelectorAll("[data-flash]")).toHaveLength(0);
  });

  it("does not flash card values under reduced motion", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const { host, settle } = await mount();
    host.flash.mark([
      {
        type: "update",
        id: "1",
        prev: ROWS[0]!,
        next: { ...ROWS[0]!, budget: 12 },
        index: 0,
      },
    ]);
    await settle();
    expect(part("card-value").textContent?.trim()).toBe("Ada");
    expect(document.querySelectorAll("[data-flash]")).toHaveLength(0);
  });

  it("keeps dirty card marks until host confirmation and reports the unsaved count", async () => {
    const seen: DirtyEdits[] = [];
    // A pending save is unacknowledged; core confirms synchronous saves immediately.
    const save = vi.fn(() => new Promise<void>(() => undefined));
    const { settle } = await mount({
      features: [
        editing(save, {
          onDirtyChange: (state) => {
            seen.push(state);
          },
        }),
        dirtyIndicators(),
      ],
    });
    expect(seen.map((state) => state.count)).toEqual([0]);
    await editBudget(settle, "41");
    expect(save).toHaveBeenCalledExactlyOnceWith(ROWS[0], "budget", 41);
    expect(seen.at(-1)!.count).toBe(1);
    expect(
      parts("card").map((node) => node.hasAttribute("data-dirty"))
    ).toEqual([true, false]);
    seen.at(-1)!.confirm("1", "budget");
    await settle();
    expect(seen.at(-1)!.count).toBe(0);
    expect(
      parts("card").map((node) => node.hasAttribute("data-dirty"))
    ).toEqual([false, false]);
  });

  it("clears a card's dirty mark only when the host save promise resolves", async () => {
    let finishSave: (() => void) | undefined;
    const saving = new Promise<void>((resolve) => {
      finishSave = resolve;
    });
    const save = vi.fn(() => saving);
    const { settle } = await mount({
      features: [editing(save), dirtyIndicators()],
    });
    await editBudget(settle, "42");
    expect(save).toHaveBeenCalledExactlyOnceWith(ROWS[0], "budget", 42);
    expect(part("card").hasAttribute("data-dirty")).toBe(true);
    if (!finishSave) throw new Error("The host did not start a save");
    finishSave();
    await saving;
    await settle();
    expect(part("card").hasAttribute("data-dirty")).toBe(false);
  });

  it("reports unsaved edits without painting marks when only the callback is requested", async () => {
    const seen: DirtyEdits[] = [];
    // A pending save is unacknowledged; core confirms synchronous saves immediately.
    const save = vi.fn(() => new Promise<void>(() => undefined));
    const { settle } = await mount({
      features: [
        editing(save, {
          onDirtyChange: (state) => {
            seen.push(state);
          },
        }),
      ],
    });
    await editBudget(settle, "43");
    expect(save).toHaveBeenCalledExactlyOnceWith(ROWS[0], "budget", 43);
    expect(seen.at(-1)!.count).toBe(1);
    expect(document.querySelectorAll("[data-dirty]")).toHaveLength(0);
  });

  it.each([true, false])(
    "relabels reorder controls without a reorder-state change (mobile=%s)",
    async (mobile) => {
      const { host, settle } = await mount({
        mobile,
        features: [rowReorder<Person>(vi.fn())],
      });
      host.labels.set({
        reorderRow: "Mover fila",
        moveRowUp: "Subir fila",
        moveRowDown: "Bajar fila",
      });
      await settle();
      if (mobile) {
        expect(
          parts("row-reorder-up").map((node) => node.getAttribute("aria-label"))
        ).toEqual(["Subir fila", "Subir fila"]);
        expect(
          parts("row-reorder-down").map((node) =>
            node.getAttribute("aria-label")
          )
        ).toEqual(["Bajar fila", "Bajar fila"]);
      } else {
        expect(
          parts("row-reorder-handle").map((node) =>
            node.getAttribute("aria-label")
          )
        ).toEqual(["Mover fila", "Mover fila"]);
      }
    }
  );

  it.each([true, false])(
    "reorders the immutable replacement row instead of cached fields (mobile=%s)",
    async (mobile) => {
      const reordered = vi.fn();
      const { host, settle } = await mount({
        mobile,
        features: [rowReorder<Person>(reordered)],
      });
      const replacement: Person = {
        ...ROWS[0]!,
        name: "Ada updated",
        budget: 99,
      };
      host.rows.set([replacement, ROWS[1]!]);
      await settle();
      expect(part(mobile ? "card" : "row").textContent).toContain(
        "Ada updated"
      );
      if (mobile) {
        part("row-reorder-down").click();
      } else {
        const grip = part("row-reorder-handle");
        key(grip, " ");
        key(grip, "ArrowDown");
        key(grip, " ");
      }
      await settle();
      expect(reordered).toHaveBeenCalledExactlyOnceWith(0, 1, replacement);
      expect(reordered.mock.calls[0]![2]).toBe(replacement);
    }
  );

  it.each(["top", "bottom"] as const)(
    "does not expose reorder markers or accept drops on a %s summary",
    async (side) => {
      const reordered = vi.fn();
      const { settle } = await mount({
        mobile: false,
        features: [
          rowReorder<Person>(reordered),
          pinnedSummaryRows<Person>({
            [side]: [{ id: "total", name: "Total", budget: 30 }],
          }),
        ],
      });
      const payloads = new Map<string, string>();
      const transfer = {
        effectAllowed: "none",
        dropEffect: "none",
        setData: (name: string, value: string) => {
          payloads.set(name, value);
        },
        getData: (name: string) => payloads.get(name) ?? "",
      };
      const drag = (type: string): MouseEvent => {
        const event = new MouseEvent(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, "dataTransfer", { value: transfer });
        return event;
      };
      const [first, second] = parts("row");
      const grip = part("row-reorder-handle", second);
      const summary = part(`pinned-summary-${side}`);
      grip.dispatchEvent(drag("dragstart"));
      await settle();
      expect(second!.hasAttribute("data-dragging")).toBe(true);
      // Establish a real drop target at the same local index as the summary.
      first!.dispatchEvent(drag("dragover"));
      await settle();
      expect(first!.hasAttribute("data-drop")).toBe(true);
      expect(summary.hasAttribute("data-drop")).toBe(false);
      expect(summary.hasAttribute("data-dragging")).toBe(false);
      const over = drag("dragover");
      summary.dispatchEvent(over);
      const drop = drag("drop");
      summary.dispatchEvent(drop);
      await settle();
      expect(over.defaultPrevented).toBe(false);
      expect(drop.defaultPrevented).toBe(false);
      expect(reordered).not.toHaveBeenCalled();
      // The same drag can still finish on an ordinary data row.
      first!.dispatchEvent(drag("drop"));
      await settle();
      expect(reordered).toHaveBeenCalledExactlyOnceWith(1, 0, ROWS[1]);
    }
  );

  it("applies card classes alongside host appearance and updates them live", async () => {
    const { host, settle } = await mount({
      features: [
        rowAppearance<Person>({
          rowClassName: (row) => `person-${row.id}`,
          rowStyle: () => ({ backgroundColor: "pink" }),
        }),
        rowDetail<Person>(Detail),
        rowReorder<Person>(vi.fn()),
        rowActions([{ key: "inspect", label: "Inspect", onClick: vi.fn() }]),
      ],
      summary: () => ({ budget: 30 }),
    });
    host.classes.set({
      cards: "cards-hook",
      card: "card-hook",
      cardRow: "row-hook",
      cardLabel: "label-hook",
      cardValue: "value-hook",
      cardActions: "actions-hook",
      cardDetail: "detail-hook",
      checkbox: "checkbox-hook",
      rowReorderButtons: "reorder-hook",
      rowReorderUp: "up-hook",
      rowReorderDown: "down-hook",
      actionButton: "action-hook",
      summaryCard: "summary-hook",
    });
    await settle();
    const first = part("card");
    expect(first.className).toBe("card-hook person-1");
    expect(first.style.backgroundColor).toBe("pink");
    expect(part("cards").className).toBe("cards-hook");
    for (const [name, className] of [
      ["card-row", "row-hook"],
      ["card-label", "label-hook"],
      ["card-value", "value-hook"],
      ["card-actions", "actions-hook"],
      ["checkbox", "checkbox-hook"],
      ["row-reorder-buttons", "reorder-hook"],
      ["row-reorder-up", "up-hook"],
      ["row-reorder-down", "down-hook"],
      ["action-button", "action-hook"],
    ]) {
      expect(part(name!, first).className).toBe(className);
    }
    expect(part("summary-card").className).toBe("card-hook summary-hook");
    part("expand-button", first).click();
    await settle();
    expect(part("card-detail", first).className).toBe("detail-hook");
    host.classes.set({ card: "new-card" });
    await settle();
    expect(first.className).toBe("new-card person-1");
    expect(part("card-value", first).className).toBe("");
  });
});
