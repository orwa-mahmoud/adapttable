/**
 * The side panel, drawn with native controls.
 */
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type TemplateRef,
} from "@angular/core";

/** The docked frame. The chrome outlets the header and the body into it. */
@Component({
  selector: "adapt-side-panel-frame",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    <aside
      data-adapttable-part="side-panel"
      [attr.data-side]="props().side"
      [class]="props().className"
      style="width: 280px; flex-shrink: 0"
    >
      @if (props().header; as header) {
        <ng-container [ngTemplateOutlet]="header" />
      }
      @if (props().body; as body) {
        <ng-container [ngTemplateOutlet]="body" />
      }
    </aside>
  `,
})
export class AdaptSidePanelFrame {
  /** The edge, the class, and the chrome's header and body. */
  readonly props = input.required<{
    readonly side: "start" | "end";
    readonly className?: string;
    readonly header?: TemplateRef<unknown>;
    readonly body?: TemplateRef<unknown>;
  }>();
}

/** One tab in the strip. */
@Component({
  selector: "adapt-side-panel-tab",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="btn btn-outline-secondary btn-sm"
      type="button"
      role="tab"
      data-adapttable-part="side-panel-tab"
      [id]="props().buttonProps.id"
      [attr.tabindex]="props().buttonProps.tabIndex"
      [attr.aria-selected]="props().buttonProps['aria-selected']"
      [attr.aria-controls]="props().buttonProps['aria-controls']"
      [attr.data-active]="props().selected ? '' : null"
      (click)="props().buttonProps.onClick()"
      (keydown)="props().buttonProps.onKeyDown($event)"
    >
      {{ props().panel.label ?? props().panel.key }}
    </button>
  `,
})
export class AdaptSidePanelTab {
  /** The panel and the tab button's wiring. */
  readonly props = input.required<{
    readonly panel: { readonly key: string; readonly label?: string };
    readonly selected: boolean;
    readonly buttonProps: {
      readonly id: string;
      readonly tabIndex: number;
      readonly "aria-selected": boolean;
      readonly "aria-controls": string;
      readonly onClick: () => void;
      readonly onKeyDown: (event: KeyboardEvent) => void;
    };
  }>();
}

/** The control that closes the panel. */
@Component({
  selector: "adapt-side-panel-close",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="btn btn-outline-secondary btn-sm"
      type="button"
      data-adapttable-part="side-panel-close"
      [attr.aria-label]="props().label"
      (click)="props().onClose()"
    >
      ×
    </button>
  `,
})
export class AdaptSidePanelClose {
  /** The accessible name and the close handler. */
  readonly props = input.required<{
    readonly label: string;
    readonly onClose: () => void;
  }>();
}
