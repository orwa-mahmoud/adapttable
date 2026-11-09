import { computed, type Signal } from "@angular/core";
import type { NgbConfig } from "@ng-bootstrap/ng-bootstrap";

/**
 * ng-bootstrap's motion switch.
 *
 * `NgbConfig.animation` defaults to `true` and is a mutable field, so only
 * `false` turns the table's animation off. The default leaves the operating
 * system in charge. ng-bootstrap has no app-wide direction, locale, or size
 * setting. The read is not a signal: a change made after the table has
 * already asked stays unseen until the table is created again.
 */
export function ngBootstrapMotionOff(config: NgbConfig): Signal<boolean> {
  return computed(() => config.animation === false);
}
