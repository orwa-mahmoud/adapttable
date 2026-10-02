/**
 * The server-export progress surface.
 *
 * Core decides when the surface exists, which actions are legal, and every
 * localized string. The kit draws the one surface this chrome hands those to.
 */
import {
  type ExportProgressState,
  exportProgressView,
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
 * The kit's surface for {@link AdaptExportProgressChrome}.
 *
 * @public
 */
export interface ExportProgressSlots {
  /** The visible progress surface. */
  readonly Surface: Type<unknown>;
}

/**
 * Turns export lifecycle state into the kit's progress surface. Renders
 * nothing for a browser-built file, which has no progress to show.
 *
 * @public
 */
@Component({
  selector: "adapt-export-progress-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (view(); as props) {
      <ng-container
        [adaptControl]="slots().Surface"
        [adaptControlProps]="props"
      />
    }
  `,
})
export class AdaptExportProgressChrome {
  /** Shared lifecycle state, or null when the file is built in the browser. */
  readonly progress = input<ExportProgressState | null>(null);

  /** Resolved table labels. */
  readonly labels = input.required<TableLabels>();

  /** The kit's surface. */
  readonly slots = input.required<ExportProgressSlots>();

  /** The view the surface renders, absent when there is no progress. */
  protected readonly view = computed(() => {
    const progress = this.progress();
    if (!progress) return undefined;
    return exportProgressView(progress, this.labels());
  });
}
