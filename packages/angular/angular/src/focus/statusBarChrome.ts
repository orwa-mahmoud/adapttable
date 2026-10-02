/**
 * The status bar: how many rows are showing, how many are selected, and the
 * selection figures beside them.
 *
 * Notices for a feature that cannot run show even when the host did not ask
 * for the strip. The kit draws the row; the wording stays here.
 */
import {
  type FeatureNotice,
  type SelectionStats,
  type StatusBarItem,
  statusBarItems,
  type TableLabels,
} from "@adapttable/core";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type TemplateRef,
  type Type,
  viewChild,
} from "@angular/core";

import { AdaptControl } from "../control";
import {
  AdaptSelectionStatsChrome,
  type SelectionStatsSlots,
} from "./selectionStatsBar";

/**
 * The kit's controls for {@link AdaptStatusBarChrome}.
 *
 * @public
 */
export interface StatusBarSlots {
  /** The strip itself. */
  readonly Bar: Type<unknown>;
  /** The selection figures inside the strip. */
  readonly stats: SelectionStatsSlots;
}

/**
 * Renders the status bar, or only the selection figures when the strip is off.
 *
 * @public
 */
@Component({
  selector: "adapt-status-bar-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl, AdaptSelectionStatsChrome],
  template: `
    @if (showBar()) {
      <ng-template #figures>
        <adapt-selection-stats-chrome
          [stats]="stats()"
          [labels]="labels()"
          [locale]="locale()"
          [slots]="slots().stats"
        />
      </ng-template>
      <ng-container
        [adaptControl]="slots().Bar"
        [adaptControlProps]="barProps()"
      />
    } @else {
      <adapt-selection-stats-chrome
        [stats]="stats()"
        [labels]="labels()"
        [locale]="locale()"
        [slots]="slots().stats"
      />
    }
  `,
})
export class AdaptStatusBarChrome {
  /** Whether the host asked for the strip. */
  readonly enabled = input.required<boolean>();
  /** How many rows are rendered right now. */
  readonly shown = input.required<number>();
  /** The page being shown. */
  readonly page = input<number | undefined>(undefined);
  /** The page size. */
  readonly limit = input<number | undefined>(undefined);
  /** How many rows the whole filtered set holds. */
  readonly total = input<number | undefined>(undefined);
  /** How many rows are selected. */
  readonly selected = input.required<number>();
  /** The multi-cell selection's figures. */
  readonly stats = input<SelectionStats | null>(null);
  /** Labels. Gaps fall back to English. */
  readonly labels = input<TableLabels | undefined>(undefined);
  /** Locale for the selection figures. */
  readonly locale = input<string | undefined>(undefined);
  /** A kit's own class for the strip. */
  readonly className = input<string | undefined>(undefined);
  /** Features the host asked for that cannot run. */
  readonly notices = input<readonly FeatureNotice[] | undefined>(undefined);
  /** The kit's strip and selection figures. */
  readonly slots = input.required<StatusBarSlots>();

  private readonly statsTpl = viewChild<TemplateRef<unknown>>("figures");

  /** The figures, notices first. */
  protected readonly items = computed(() =>
    statusBarItems({
      enabled: this.enabled(),
      shown: this.shown(),
      page: this.page(),
      limit: this.limit(),
      total: this.total(),
      selected: this.selected(),
      labels: this.labels(),
      notices: this.notices(),
    })
  );

  /** The strip shows when the host asked, or a notice has to be seen. */
  protected readonly showBar = computed(
    () => this.enabled() || this.items().length > 0
  );

  /** Props for the kit's strip. */
  protected readonly barProps = computed(
    (): {
      readonly items: readonly StatusBarItem[];
      readonly stats?: TemplateRef<unknown>;
      readonly className?: string;
    } => ({
      items: this.items(),
      stats: this.statsTpl(),
      className: this.className(),
    })
  );
}
