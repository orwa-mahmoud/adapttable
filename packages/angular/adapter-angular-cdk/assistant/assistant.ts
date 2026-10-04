/** CDK-backed neutral controls and overlays; the adapter owns their appearance. */
import {
  AdaptAssistantContent,
  AdaptTableAssistantChrome,
  createAdapterTableAssistantFeature,
  type TableAssistantBadgeProps,
  type TableAssistantButtonProps,
  type TableAssistantComposerProps,
  type TableAssistantLanguageChipProps,
  type TableAssistantMenuProps,
  type TableAssistantPanelProps,
  type TableAssistantProps,
  type TableAssistantSheetProps,
  type TableAssistantSlots,
  type TableAssistantWindowProps,
} from "@adapttable/angular";
import { AdaptCdkPopover } from "@adapttable/angular-cdk";
import { A11yModule } from "@angular/cdk/a11y";
import { Dir, Directionality } from "@angular/cdk/bidi";
import { Overlay, OverlayModule } from "@angular/cdk/overlay";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  viewChild,
} from "@angular/core";

/** Every assistant action is a native button with an accessible name. @public */
@Component({
  selector: "adapt-assistant-button",
  imports: [A11yModule, AdaptAssistantContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<button
    cdkMonitorElementFocus
    data-adapttable-cdk-control
    type="button"
    [attr.title]="props().tooltip"
    [attr.aria-label]="props().label"
    [attr.aria-expanded]="props().expanded"
    [attr.data-adapttable-part]="props().part"
    [attr.data-variant]="props().variant"
    [class]="props().className"
    [disabled]="props().disabled === true"
    [style]="launcherStyle()"
    (click)="props().onClick()"
  >
    <adapt-assistant-content [content]="props().icon" />
    @if (!props().iconOnly) {
      <adapt-assistant-content [content]="props().children ?? props().label" />
    }
  </button>`,
})
export class AdaptAssistantButton {
  readonly props = input.required<TableAssistantButtonProps>();
  protected readonly launcherStyle = computed(() =>
    this.props().part === "assistant-launcher"
      ? {
          inlineSize: "56px",
          blockSize: "56px",
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }
      : {}
  );
}

/** Native multiline entry; keyboard events travel unchanged to the binding. @public */
@Component({
  imports: [A11yModule],
  selector: "adapt-assistant-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<textarea
    cdkMonitorElementFocus
    data-adapttable-cdk-control
    rows="2"
    [attr.aria-label]="props().label"
    [placeholder]="props().placeholder"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    [value]="props().value"
    [disabled]="props().disabled === true"
    style="width:100%;min-width:0;box-sizing:border-box;font:inherit;resize:vertical"
    (input)="changed($event)"
    (keydown)="props().onKeyDown($event)"
  ></textarea>`,
})
export class AdaptAssistantInput {
  readonly props = input.required<TableAssistantComposerProps>();
  protected changed(event: Event): void {
    this.props().onChange((event.target as HTMLTextAreaElement).value);
  }
}

/** Native connection badge. @public */
@Component({
  selector: "adapt-assistant-badge",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<span
    [attr.data-adapttable-part]="props().part"
    [attr.data-tone]="props().tone"
    [class]="props().className"
    >{{ props().label }}</span
  >`,
})
export class AdaptAssistantBadge {
  readonly props = input.required<TableAssistantBadgeProps>();
}

/** The in-flow conversation surface. @public */
@Component({
  selector: "adapt-assistant-panel",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<section
    [attr.aria-label]="props().label"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
  >
    <ng-container [ngTemplateOutlet]="props().children" />
  </section>`,
})
export class AdaptAssistantPanel {
  readonly props = input.required<TableAssistantPanelProps>();
}

/** CDK modal with a blocking backdrop, focus capture and restoration. @public */
@Component({
  selector: "adapt-assistant-sheet",
  imports: [A11yModule, OverlayModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<span cdkOverlayOrigin #origin="cdkOverlayOrigin"></span>
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="props().open"
      [cdkConnectedOverlayHasBackdrop]="true"
      [cdkConnectedOverlayDisableClose]="true"
      [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
      cdkConnectedOverlayBackdropClass="adapt-cdk-backdrop"
      cdkConnectedOverlayPanelClass="adapt-cdk-modal-overlay"
      (backdropClick)="props().onClose()"
      (overlayKeydown)="keydown($event)"
    >
      <section
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        class="adapt-cdk-surface"
        [attr.aria-label]="props().label"
        [dir]="props().dir ?? 'ltr'"
        [attr.data-adapttable-part]="props().part"
        style="inline-size: min(420px, calc(100vw - 16px)); block-size: 80dvh; max-block-size: 80dvh; min-block-size: 0; box-sizing: border-box"
        [class]="props().className"
      >
        <ng-container [ngTemplateOutlet]="props().children" />
      </section>
    </ng-template>`,
})
export class AdaptAssistantSheet {
  readonly props = input.required<TableAssistantSheetProps>();
  protected readonly scrollStrategy = inject(Overlay).scrollStrategies.block();
  protected keydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.props().onClose();
  }
}

/** A nonmodal native dialog leaves the table behind it operable. @public */
@Component({
  selector: "adapt-assistant-window",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<dialog
    open
    [attr.aria-label]="props().label"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    [style]="props().style"
    style="margin:0;padding:0;border:0"
  >
    <ng-container [ngTemplateOutlet]="props().children" />
  </dialog>`,
})
export class AdaptAssistantWindow {
  readonly props = input.required<TableAssistantWindowProps>();
}

/** Native dictation language selection. @public */
@Component({
  imports: [A11yModule],
  selector: "adapt-assistant-language-chip",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<select
    cdkMonitorElementFocus
    data-adapttable-cdk-control
    [attr.aria-label]="props().label"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    [value]="props().value"
    [disabled]="props().disabled === true"
    (change)="changed($event)"
  >
    @for (option of props().options; track option.value) {
      <option [value]="option.value">{{ option.label }}</option>
    }
  </select>`,
})
export class AdaptAssistantLanguageChip {
  readonly props = input.required<TableAssistantLanguageChipProps>();
  protected changed(event: Event): void {
    this.props().onChange((event.target as HTMLSelectElement).value);
  }
}

/** Backdrop-free CDK examples disclosure. @public */
@Component({
  selector: "adapt-assistant-menu",
  imports: [A11yModule, AdaptCdkPopover, AdaptAssistantContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<span data-adapttable-part="assistant-examples">
    <adapt-cdk-popover
      [dir]="inheritedDirection.valueSignal()"
      [trigger]="trigger"
      [content]="content"
    />
    <ng-template #trigger let-toggle let-open="open">
      <button
        cdkMonitorElementFocus
        data-adapttable-cdk-control
        type="button"
        [attr.aria-label]="props().label"
        [title]="props().label"
        [attr.aria-expanded]="open"
        [attr.data-adapttable-part]="props().part"
        [class]="props().className"
        [disabled]="props().disabled === true"
        (click)="toggle()"
      >
        <adapt-assistant-content [content]="props().icon" />
      </button>
    </ng-template>
    <ng-template #content>
      <menu
        data-adapttable-part="assistant-examples-list"
        [style.max-height]="props().maxHeight"
        style="overflow-y:auto"
      >
        @for (item of props().items; track item.id) {
          <li>
            <button
              cdkMonitorElementFocus
              data-adapttable-cdk-control
              type="button"
              [attr.data-adapttable-part]="item.part"
              [disabled]="props().disabled === true"
              (click)="select(item.id)"
            >
              <adapt-assistant-content [content]="item.icon" /><span>{{
                item.title
              }}</span>
              @if (item.description) {
                <small>{{ item.description }}</small>
              }
            </button>
          </li>
        }
      </menu>
    </ng-template>
  </span>`,
})
export class AdaptAssistantMenu {
  protected readonly inheritedDirection = inject(Directionality);
  readonly props = input.required<TableAssistantMenuProps>();
  private readonly popover = viewChild.required(AdaptCdkPopover);
  protected select(id: string): void {
    if (this.props().disabled) return;
    this.popover().close();
    this.props().onSelect(id);
  }
}

/** Every control in the native assistant, including its optional voice and examples. @public */
export const TABLE_ASSISTANT_SLOTS: TableAssistantSlots = {
  Panel: AdaptAssistantPanel,
  Sheet: AdaptAssistantSheet,
  Window: AdaptAssistantWindow,
  Button: AdaptAssistantButton,
  Composer: AdaptAssistantInput,
  Badge: AdaptAssistantBadge,
  Menu: AdaptAssistantMenu,
  LanguageChip: AdaptAssistantLanguageChip,
};

/** A complete native assistant, directly mountable beside a table. @public */
@Component({
  selector: "adapt-table-assistant",
  imports: [AdaptTableAssistantChrome, Dir],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<div
    style="display: contents"
    [dir]="props().dir ?? inheritedDirection.valueSignal()"
  >
    <adapt-table-assistant-chrome [props]="accented()" [slots]="slots" />
  </div>`,
})
export class AdaptTableAssistant {
  protected readonly inheritedDirection = inject(Directionality);
  readonly props = input.required<TableAssistantProps>();
  protected readonly accented = computed((): TableAssistantProps => ({
    accent: "AccentColor",
    ...this.props(),
  }));
  protected readonly slots = TABLE_ASSISTANT_SLOTS;
}

/** Compose the native assistant into TABLE_ASSISTANT. @public */
export function tableAssistant() {
  return createAdapterTableAssistantFeature(AdaptTableAssistant);
}
