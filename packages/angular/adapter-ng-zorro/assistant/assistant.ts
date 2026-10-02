/** NG-ZORRO surfaces and controls for the shared assistant Chrome. */
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
import { AdaptOverlayOrigin } from "@adapttable/ng-zorro";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzDrawerModule } from "ng-zorro-antd/drawer";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";
import { NzTagModule } from "ng-zorro-antd/tag";
import { NzTooltipModule } from "ng-zorro-antd/tooltip";
import { NzTypographyModule } from "ng-zorro-antd/typography";

/** Every assistant action uses the kit's button and optional tooltip. @public */
@Component({
  selector: "adapt-assistant-button",
  imports: [AdaptAssistantContent, NzButtonModule, NzTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<button
    nz-button
    nz-tooltip
    [nzTooltipTitle]="props().tooltip ?? null"
    [nzType]="
      props().iconOnly || props().variant === 'subtle'
        ? 'text'
        : props().variant === 'primary'
          ? 'primary'
          : 'default'
    "
    [nzSize]="props().part === 'assistant-launcher' ? 'large' : 'small'"
    type="button"
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

/** Kit textarea; keyboard events travel unchanged to the binding. @public */
@Component({
  selector: "adapt-assistant-input",
  imports: [NzInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<textarea
    nz-input
    rows="2"
    [attr.aria-label]="props().label"
    [placeholder]="props().placeholder"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    [value]="props().value"
    [disabled]="props().disabled === true"
    style="width:100%;min-width:0;box-sizing:border-box;field-sizing:content;min-block-size:2.5em;max-block-size:10em;resize:vertical"
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

/** Kit connection tag. @public */
@Component({
  selector: "adapt-assistant-badge",
  imports: [NzTagModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<nz-tag
    [nzColor]="color()"
    [attr.data-adapttable-part]="props().part"
    [attr.data-tone]="props().tone"
    [class]="props().className"
    >{{ props().label }}</nz-tag
  >`,
})
export class AdaptAssistantBadge {
  readonly props = input.required<TableAssistantBadgeProps>();
  protected readonly color = computed(() => {
    const tone = this.props().tone;
    if (tone === "busy") return "processing";
    if (tone === "warning") return "warning";
    if (tone === "danger") return "error";
    return undefined;
  });
}

/** The in-flow conversation card. @public */
@Component({
  selector: "adapt-assistant-panel",
  imports: [NgTemplateOutlet, NzCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<nz-card
    nzSize="small"
    role="region"
    [attr.aria-label]="props().label"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    [nzBodyStyle]="{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '0',
    }"
    style="height:100%"
  >
    <ng-container [ngTemplateOutlet]="props().children" />
  </nz-card>`,
})
export class AdaptAssistantPanel {
  readonly props = input.required<TableAssistantPanelProps>();
}

/** The bottom drawer owns backdrop, focus containment and portal stacking. @public */
@Component({
  selector: "adapt-assistant-sheet",
  imports: [NgTemplateOutlet, NzCardModule, NzDrawerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<div [dir]="props().dir ?? 'ltr'" style="display:contents">
    <nz-drawer
      nzPlacement="bottom"
      nzHeight="90%"
      [nzZIndex]="10050"
      [nzVisible]="props().open"
      [nzClosable]="false"
      [nzMask]="true"
      [nzKeyboard]="false"
      [nzBodyStyle]="{ padding: '0', overflow: 'hidden' }"
      (nzOnClose)="props().onClose()"
    >
      <ng-container *nzDrawerContent>
        <nz-card
          nzSize="small"
          [nzBordered]="false"
          role="dialog"
          aria-modal="true"
          [dir]="props().dir ?? 'ltr'"
          [attr.aria-label]="props().label"
          [attr.data-adapttable-part]="props().part"
          [class]="props().className"
          [nzBodyStyle]="{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '0',
          }"
          style="height:100%"
          (keydown)="onKeyDown($event)"
        >
          <ng-container [ngTemplateOutlet]="props().children" />
        </nz-card>
      </ng-container>
    </nz-drawer>
  </div>`,
})
export class AdaptAssistantSheet {
  readonly props = input.required<TableAssistantSheetProps>();
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.props().onClose();
  }
}

/** A nonmodal floating card leaves the table behind it operable. @public */
@Component({
  selector: "adapt-assistant-window",
  imports: [NgTemplateOutlet, NzCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<nz-card
    nzSize="small"
    role="dialog"
    [attr.aria-label]="props().label"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    [style]="props().style"
    [nzBodyStyle]="{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '0',
    }"
    style="margin:0;box-shadow:0 6px 20px #0002"
  >
    <ng-container [ngTemplateOutlet]="props().children" />
  </nz-card>`,
})
export class AdaptAssistantWindow {
  readonly props = input.required<TableAssistantWindowProps>();
}

/** Kit dictation language selection. @public */
@Component({
  selector: "adapt-assistant-language-chip",
  imports: [AdaptOverlayOrigin, FormsModule, NzSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<nz-select
    adaptOverlayOrigin
    nzSize="small"
    [attr.aria-label]="props().label"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    [ngModel]="props().value"
    [ngModelOptions]="{ standalone: true }"
    [nzDisabled]="props().disabled === true"
    style="min-width:7.5rem"
    (ngModelChange)="props().onChange($event)"
  >
    @for (option of props().options; track option.value) {
      <nz-option [nzValue]="option.value" [nzLabel]="option.label" />
    }
  </nz-select>`,
})
export class AdaptAssistantLanguageChip {
  readonly props = input.required<TableAssistantLanguageChipProps>();
}

/** The kit dropdown keeps examples local and consumes its nested Escape. @public */
@Component({
  selector: "adapt-assistant-menu",
  imports: [
    AdaptAssistantContent,
    NzButtonModule,
    NzDropdownModule,
    NzTooltipModule,
    NzTypographyModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  templateUrl: "./assistant.html",
})
export class AdaptAssistantMenu {
  readonly props = input.required<TableAssistantMenuProps>();
  protected readonly open = signal(false);
  private readonly trigger = viewChild.required<
    ElementRef<HTMLButtonElement>,
    ElementRef<HTMLButtonElement>
  >("trigger", { read: ElementRef });
  protected select(id: string): void {
    if (this.props().disabled) return;
    this.open.set(false);
    this.trigger().nativeElement.focus();
    this.props().onSelect(id);
  }
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape" && this.open()) {
      event.preventDefault();
      event.stopPropagation();
      this.open.set(false);
      this.trigger().nativeElement.focus();
    }
  }
}

/** Every control in the kit assistant, including optional voice and examples. @public */
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

/** A complete NG-ZORRO assistant, directly mountable beside a table. @public */
@Component({
  selector: "adapt-table-assistant",
  imports: [AdaptTableAssistantChrome, NzCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<div [dir]="props().dir ?? 'ltr'" style="display:contents">
    <adapt-table-assistant-chrome [props]="accented()" [slots]="slots" />
  </div>`,
})
export class AdaptTableAssistant {
  readonly props = input.required<TableAssistantProps>();
  protected readonly accented = computed((): TableAssistantProps => ({
    accent: "var(--ant-primary-color, #1677ff)",
    ...this.props(),
  }));
  protected readonly slots = TABLE_ASSISTANT_SLOTS;
}

/** Compose the kit assistant into TABLE_ASSISTANT. @public */
export function tableAssistant() {
  return createAdapterTableAssistantFeature(AdaptTableAssistant);
}
