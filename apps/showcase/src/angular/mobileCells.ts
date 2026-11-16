/**
 * Shared data, plus the two cells no kit draws differently: the timeline's
 * start over its due date, and the budget in tabular figures. Each selected kit
 * owns its avatar, tag and progress markup.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  input,
} from "@angular/core";

import { type Person, personName, personRole, utilization } from "../people";
import {
  loadCaption,
  personInitials,
  timelineLines,
} from "../shared/peopleTable";
import { SHOWCASE_PRESENTATION } from "./data";

@Directive()
export abstract class ShowcaseMobileCellModel {
  readonly row = input.required<Person>();
  readonly value = input.required<unknown>();
  readonly name = computed(() =>
    personName(
      this.row(),
      SHOWCASE_PRESENTATION.locale.startsWith("ar") ? "ar" : "en"
    )
  );
  readonly initials = computed(() => personInitials(this.name()));
  readonly role = computed(() =>
    personRole(
      this.row(),
      SHOWCASE_PRESENTATION.locale.startsWith("ar") ? "ar" : "en"
    )
  );
  readonly load = computed(() => utilization(this.row()));
  /** The timeline's two lines, "Mar 8, 2026" over "→ Apr 12, 2026". */
  readonly timeline = computed(() =>
    timelineLines(
      this.row(),
      SHOWCASE_PRESENTATION.locale.startsWith("ar") ? "ar" : "en"
    )
  );
  /** What the load cell writes under its bar, "56% · 7". */
  readonly caption = computed(() =>
    loadCaption(
      this.row(),
      SHOWCASE_PRESENTATION.locale.startsWith("ar") ? "ar" : "en"
    )
  );
}

/** The timeline cell, as every framework draws it. */
@Component({
  selector: "adapt-demo-timeline",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<strong>{{ timeline().start }}</strong
    ><small>{{ timeline().end }}</small>`,
  styles: `
    :host {
      display: inline-flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      line-height: 1.35;
    }
    strong {
      font-weight: 550;
    }
    small {
      opacity: 0.6;
      font-size: 0.82em;
    }
  `,
})
export class ShowcaseTimeline extends ShowcaseMobileCellModel {}

/** The budget cell, in tabular figures. */
@Component({
  selector: "adapt-demo-budget",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ value() }}`,
  styles: `
    :host {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
  `,
})
export class ShowcaseBudget extends ShowcaseMobileCellModel {}
