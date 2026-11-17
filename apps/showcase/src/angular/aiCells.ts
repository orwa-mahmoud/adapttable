/** The AI page's own cells: salary in thousands as money, and plain status text. */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

import { salaryText, type StaffRow } from "../shared/aiDemo";

/** Salary as the money it counts; the column's value stays the number. */
@Component({
  selector: "adapt-ai-salary-cell",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ text() }}`,
})
export class AiSalaryCell {
  readonly row = input.required<StaffRow>();
  readonly value = input<unknown>();
  readonly text = computed(() => salaryText(this.row().salary));
}

/** The status as written: the staff page shows it as text, not a tag. */
@Component({
  selector: "adapt-ai-text-cell",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ text() }}`,
})
export class AiTextCell {
  readonly row = input<unknown>();
  readonly value = input<unknown>();
  readonly text = computed(() => {
    const value = this.value();
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : "";
  });
}
