import type { CellContext } from "@adapttable/angular";
import { pivot, type PivotRow } from "@adapttable/angular/pivot";
import {
  Component,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";

import { pivotTableModel } from "../../pivot/pivotTableModel";
import { AdaptPivotRowHeader } from "./pivotRowHeader";

@Component({
  template: `<ng-template #fold let-row
    ><button type="button" (click)="folded.set(row.key)">
      Fold {{ row.label }}
    </button></ng-template
  >`,
})
class TemplateHost {
  readonly fold =
    viewChild.required<TemplateRef<CellContext<PivotRow>>>("fold");
  readonly folded = signal("");
}

@Component({
  template: `<button
    type="button"
    [attr.aria-expanded]="!folded()"
    (click)="folded.set(true)"
  >
    Fold {{ row().label }}
  </button>`,
})
class FoldButton {
  readonly row = input.required<PivotRow>();
  readonly folded = signal(false);
}

const result = () =>
  pivot([{ region: "EU", team: "Alpha", amount: 10 }], {
    rows: ["region", "team"],
    columns: [],
    measures: [{ key: "amount", agg: "sum" }],
  });

describe("kit pivot row-header renderer", () => {
  it("renders the model's template with interactive row context and preserves the wrapper", () => {
    TestBed.resetTestingModule();
    const host = TestBed.createComponent(TemplateHost);
    host.detectChanges();
    const model = pivotTableModel(result(), {
      renderRowHeader: () => host.componentInstance.fold(),
    });
    const row = model.rows.find((line) => line.depth === 1)!;
    const fixture = TestBed.createComponent(AdaptPivotRowHeader);
    fixture.componentRef.setInput("row", row);
    fixture.componentRef.setInput("column", model.columns[0]);
    fixture.detectChanges();
    document.body.append(fixture.nativeElement as HTMLElement);
    try {
      const wrapper = fixture.nativeElement.querySelector(
        '[data-adapttable-part="pivot-row-header"]'
      ) as HTMLElement;
      const button = wrapper.querySelector("button")!;
      expect(model.columns[0]?.cell).toBe(AdaptPivotRowHeader);
      expect(button?.textContent?.trim()).toBe("Fold Alpha");
      button.focus();
      button.click();
      fixture.detectChanges();
      expect(host.componentInstance.folded()).toBe(row.key);
      expect(document.activeElement).toBe(button);
      expect(wrapper.style.paddingInlineStart).toBe("16px");
      expect(wrapper.getAttribute("data-pivot-kind")).toBe("leaf");
      expect(model.columns[0]?.formatValue?.(row)).toBe("Alpha");
    } finally {
      fixture.destroy();
      host.destroy();
    }
  });

  it("renders the model's component and keeps its focus and fold state", () => {
    TestBed.resetTestingModule();
    const model = pivotTableModel(result(), {
      renderRowHeader: () => FoldButton,
    });
    const fixture = TestBed.createComponent(AdaptPivotRowHeader);
    fixture.componentRef.setInput("row", model.rows[0]);
    fixture.componentRef.setInput("column", model.columns[0]);
    fixture.detectChanges();
    document.body.append(fixture.nativeElement as HTMLElement);
    try {
      const button = fixture.nativeElement.querySelector(
        "button"
      ) as HTMLButtonElement;
      expect(button?.textContent?.trim()).toBe(`Fold ${model.rows[0]!.label}`);
      expect(button.getAttribute("aria-expanded")).toBe("true");
      button.focus();
      button.click();
      fixture.detectChanges();
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(button);
    } finally {
      fixture.destroy();
    }
  });
});
