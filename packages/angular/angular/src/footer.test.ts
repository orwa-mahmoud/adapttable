/**
 * A column's footer cell: the summary value as text, or the column's own
 * footer renderer handed that value.
 */
import {
  ChangeDetectionStrategy,
  Component,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { afterEach, describe, expect, it } from "vitest";

import { aggregate } from "./aggregate/aggregate";
import { AdaptFooter } from "./cell";
import type { ColumnDef, FooterContext } from "./columnDef";

interface Row {
  id: string;
  budget: number;
}

@Component({
  selector: "test-total",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<b class="total">{{ column().key }}={{ value() }}</b>`,
})
class Total {
  readonly column = input.required<ColumnDef<Row>>();
  readonly value = input<unknown>();
}

@Component({
  imports: [AdaptFooter],
  template: `
    <ng-template #sum let-column let-value="value"
      ><i class="sum">Σ {{ value }}</i></ng-template
    >
    <table>
      <tfoot>
        <tr>
          <td [adaptFooter]="column()" [adaptFooterValue]="value()"></td>
        </tr>
      </tfoot>
    </table>
  `,
})
class Host {
  readonly sum = viewChild.required<TemplateRef<FooterContext<Row>>>("sum");
  readonly column = signal<ColumnDef<Row>>({ key: "budget" });
  readonly value = signal<unknown>(1200);
}

async function mount() {
  const fixture = TestBed.createComponent(Host);
  document.body.append(fixture.nativeElement as HTMLElement);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  return {
    host: fixture.componentInstance,
    settle: () => fixture.whenStable(),
  };
}

const cell = () => document.querySelector("td")!;

afterEach(() => {
  document.body.replaceChildren();
});

describe("AdaptFooter", () => {
  it("shows the summary value as text, and nothing for no value", async () => {
    const { host, settle } = await mount();
    expect(cell().textContent.trim()).toBe("1200");
    host.value.set(undefined);
    await settle();
    expect(cell().textContent.trim()).toBe("");
  });

  it("hands the value to the column's footer template or component", async () => {
    const { host, settle } = await mount();
    host.column.set({ key: "budget", footer: host.sum() });
    await settle();
    expect(cell().querySelector(".sum")?.textContent).toBe("Σ 1200");
    host.column.set({ key: "budget", footer: Total });
    await settle();
    expect(cell().querySelector(".total")?.textContent).toBe("budget=1200");
  });
});

describe("aggregate", () => {
  it("maps rows to one value per declared column", () => {
    const summary = aggregate<Row>({ budget: "sum", id: "count" });
    const result = summary([
      { id: "a", budget: 100 },
      { id: "b", budget: 250 },
    ]);
    expect(result.budget).toBe(350);
    expect(result.id).toBe(2);
  });
});
