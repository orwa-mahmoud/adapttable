/**
 * The status bar — `@adapttable/ng-bootstrap/status-bar`.
 *
 * @packageDocumentation
 */
import {
  AdaptStatusBarChrome,
  type AdaptTableFeature,
  extendFeature,
  type FeatureNotice,
  type SelectionStats,
  slotRender,
  STATUS_BAR,
  statusBar as bindingStatusBar,
  type StatusBarSlots,
  type TableLabels,
} from "@adapttable/angular";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { AdaptSelectionStatsBar, AdaptStatusBar } from "./bar";

export { AdaptSelectionStatsBar, AdaptStatusBar };

const SLOTS: StatusBarSlots = {
  Bar: AdaptStatusBar,
  stats: { Stats: AdaptSelectionStatsBar },
};

/**
 * The live strip: the chrome, filled with the native bar and figures.
 */
@Component({
  selector: "adapt-status-bar-live",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptStatusBarChrome],
  template: `
    <adapt-status-bar-chrome
      [enabled]="props().enabled"
      [shown]="props().shown"
      [page]="props().page"
      [limit]="props().limit"
      [total]="props().total"
      [selected]="props().selected"
      [stats]="props().stats"
      [labels]="props().labels"
      [locale]="props().locale"
      [className]="props().className"
      [notices]="props().notices"
      [slots]="slots"
    />
  `,
})
export class AdaptStatusBarLive {
  /** The table's status props, without the kit's slots. */
  readonly props = input.required<{
    readonly enabled: boolean;
    readonly shown: number;
    readonly page?: number;
    readonly limit?: number;
    readonly total?: number;
    readonly selected: number;
    readonly stats: SelectionStats | null;
    readonly labels?: TableLabels;
    readonly locale?: string;
    readonly className?: string;
    readonly notices?: readonly FeatureNotice[];
  }>();
  /** The kit's strip and selection figures. */
  readonly slots = SLOTS;
}

/**
 * A footer strip of row, page and selection figures.
 *
 * @returns The feature.
 *
 * @public
 */
export function statusBar(): AdaptTableFeature {
  return extendFeature(bindingStatusBar(), [
    slotRender(STATUS_BAR, () => AdaptStatusBarLive),
  ]);
}
