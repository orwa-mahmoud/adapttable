/** Shared demo data only; each kit renders its own status component. */
import { computed, Directive, input } from "@angular/core";

import { type Person, personStatus } from "../people";

@Directive()
export abstract class ShowcaseStatusModel {
  readonly row = input.required<Person>();
  readonly value = input.required<unknown>();
  readonly status = computed(() => personStatus(this.row()));
  readonly label = computed(() => {
    const value = this.value();
    return typeof value === "string" ? value : "";
  });
  readonly tone = computed(() => {
    switch (this.status()) {
      case "Active":
        return "success";
      case "Blocked":
        return "error";
      case "Planned":
        return "info";
      default:
        return "neutral";
    }
  });
}
