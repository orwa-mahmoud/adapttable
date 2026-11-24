/** Mobile-card parity: real host renderers, activation and live state. */
import {
  AdaptCellTemplate,
  type AdaptTableFeature,
  type ColumnDef,
  type ConfirmHandler,
  injectChangedCellFlash,
  type MobileCardField,
  type RowAction,
  type TableLabels,
} from "@adapttable/angular";
import { runRowAction } from "@adapttable/angular/adapter";
import { rowActions } from "@adapttable/angular-cdk/row-actions";
import { rowAppearance } from "@adapttable/angular-cdk/row-appearance";
import { rowDetail } from "@adapttable/angular-cdk/row-detail";
import { rowReorder } from "@adapttable/angular-cdk/row-reorder";
import { selection } from "@adapttable/angular-cdk/selection";
import { NgTemplateOutlet } from "@angular/common";
import { Component, computed, input, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it, vi } from "vitest";

import { mobileCardsTests } from "../../../angular/test/kit/suites/mobileCards";
import { kit } from "../../testing/kit";
import { AdaptDataTable } from "../dataTable";
import type { DataTableClassNames } from "../types";

for (const test of mobileCardsTests(kit)) it(test.name, test.run);

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
      [maxHeight]="maxHeight()"
      [features]="shownFeatures()"
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
  readonly shownFeatures = computed(() =>
    this.selectable() ? [selection(), ...this.features()] : this.features()
  );
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
  ...root.querySelectorAll<HTMLElement>(`[data-adapttable-part="${name}"]`),
];
function part(name: string, root: ParentNode = document): HTMLElement {
  const result = parts(name, root)[0];
  if (!result) throw new Error(`Missing ${name}`);
  return result;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("mobile card reach", () => {
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

  it("does not flash card values under reduced motion", async () => {
    vi.stubGlobal("matchMedia", (query: string): MediaQueryList => ({
      matches: query.includes("reduce"),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
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
