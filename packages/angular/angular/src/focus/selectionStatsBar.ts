/**
 * The selection figures: count, sum, average, min and max.
 *
 * Nothing is drawn until at least two cells are selected. The kit draws the
 * strip; the wording stays here.
 */
import {
  type SelectionStatPart,
  selectionStatParts,
  type SelectionStats,
  type TableLabels,
} from "@adapttable/core";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Type,
} from "@angular/core";

import { AdaptControl } from "../control";

/**
 * The kit's control for {@link AdaptSelectionStatsChrome}.
 *
 * @public
 */
export interface SelectionStatsSlots {
  /** The strip of formatted figures. */
  readonly Stats: Type<unknown>;
}

/**
 * Renders the selection statistics, or nothing when there is no multi-cell
 * selection.
 *
 * @public
 */
@Component({
  selector: "adapt-selection-stats-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl],
  template: `
    @if (statProps(); as props) {
      <ng-container
        [adaptControl]="slots().Stats"
        [adaptControlProps]="props"
      />
    }
  `,
})
export class AdaptSelectionStatsChrome {
  /** The statistics, or `null` when there is nothing to describe. */
  readonly stats = input<SelectionStats | null>(null);
  /** Labels for each figure. Gaps fall back to English. */
  readonly labels = input<TableLabels | undefined>(undefined);
  /** Locale for the numbers. The host's default when omitted. */
  readonly locale = input<string | undefined>(undefined);
  /** A kit's own class for the strip. */
  readonly className = input<string | undefined>(undefined);
  /** The kit's strip. */
  readonly slots = input.required<SelectionStatsSlots>();

  /** The formatted figures, or nothing when fewer than two cells are selected. */
  private readonly parts = computed(() =>
    selectionStatParts(this.stats(), this.labels(), this.locale())
  );

  /** Props for the kit's strip. Absent when there is nothing to show. */
  protected readonly statProps = computed(
    ():
      | {
          readonly parts: readonly SelectionStatPart[];
          readonly className?: string;
        }
      | undefined => {
      const parts = this.parts();
      if (!parts) return undefined;
      return { parts, className: this.className() };
    }
  );
}
