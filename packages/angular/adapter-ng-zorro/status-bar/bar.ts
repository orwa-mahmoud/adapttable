/**
 * The status strip and the selection figures, drawn with NG-ZORRO typography.
 */
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type TemplateRef,
} from "@angular/core";
import { NzFlexModule } from "ng-zorro-antd/flex";
import { NzTypographyModule } from "ng-zorro-antd/typography";

/** The strip under the table. */
@Component({
  selector: "adapt-status-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, NzFlexModule, NzTypographyModule],
  template: `
    <div
      nz-flex
      nzWrap="wrap"
      nzAlign="center"
      data-adapttable-part="status-bar"
      [class]="props().className"
      style="display: flex; flex-wrap: wrap; align-items: center; gap: 4px 16px; font-variant-numeric: tabular-nums"
    >
      @for (item of props().items; track item.key) {
        <span
          nz-typography
          nzType="secondary"
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
  selector: "adapt-selection-stats-bar",
  imports: [NzFlexModule, NzTypographyModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <output
      nz-flex
      nzWrap="wrap"
      data-adapttable-part="selection-stats"
      [class]="props().className"
      style="display: flex; flex-wrap: wrap; gap: 4px 16px; font-variant-numeric: tabular-nums; opacity: 0.8"
    >
      @for (part of props().parts; track part.key) {
        <span
          nz-typography
          nzType="secondary"
          data-adapttable-part="selection-stat"
          >{{ part.text }}</span
        >
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
