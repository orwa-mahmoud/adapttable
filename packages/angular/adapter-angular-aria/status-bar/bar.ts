/**
 * The status strip and the selection figures, drawn with native elements.
 */
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type TemplateRef,
} from "@angular/core";

/** The strip under the table. */
@Component({
  host: { class: "adapt-aria" },
  selector: "adapt-status-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    <div
      data-adapttable-part="status-bar"
      [class]="props().className"
      style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; font-variant-numeric: tabular-nums"
    >
      @for (item of props().items; track item.key) {
        <span
          data-adapttable-part="status-item"
          [attr.data-status]="item.key"
          [attr.data-appearance]="item.appearance ?? null"
        >
          {{ item.text }}
        </span>
      }
      @if (props().stats; as stats) {
        <ng-container [ngTemplateOutlet]="stats" />
      }
    </div>
  `,
})
export class AdaptStatusBar {
  /** The figures and the selection strip. */
  readonly props = input.required<{
    readonly items: readonly {
      readonly key: string;
      readonly text: string;
      readonly appearance?: string;
    }[];
    readonly stats?: TemplateRef<unknown>;
    readonly className?: string;
  }>();
}

/** The selection figures. */
@Component({
  host: { class: "adapt-aria" },
  selector: "adapt-selection-stats-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <output
      data-adapttable-part="selection-stats"
      [class]="props().className"
      style="display: flex; flex-wrap: wrap; gap: 4px 16px; font-variant-numeric: tabular-nums; opacity: 0.8"
    >
      @for (part of props().parts; track part.key) {
        <span data-adapttable-part="selection-stat">{{ part.text }}</span>
      }
    </output>
  `,
})
export class AdaptSelectionStatsBar {
  /** The formatted figures. */
  readonly props = input.required<{
    readonly parts: readonly { readonly key: string; readonly text: string }[];
    readonly className?: string;
  }>();
}
