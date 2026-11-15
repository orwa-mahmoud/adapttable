/** Shared data only; each selected kit owns its avatar and progress markup. */
import { computed, Directive, input } from "@angular/core";

import { type Person, personName, personRole, utilization } from "../people";
import { loadCaption, personInitials } from "../shared/peopleTable";
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
  /** What the load cell writes under its bar, "56% · 7". */
  readonly caption = computed(() =>
    loadCaption(
      this.row(),
      SHOWCASE_PRESENTATION.locale.startsWith("ar") ? "ar" : "en"
    )
  );
}
