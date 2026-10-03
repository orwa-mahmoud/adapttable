/** Angular Material fills the assistant controls, menus and modal surfaces. */
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
import { AdaptMaterialDialog } from "@adapttable/angular-material";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatMenuModule } from "@angular/material/menu";
import { MatTooltipModule } from "@angular/material/tooltip";

/** Every assistant action is a native button with an accessible name. @public */
@Component({
  selector: "adapt-assistant-button",
  imports: [MatButtonModule, MatTooltipModule, AdaptAssistantContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<button
    mat-button
    type="button"
    [matTooltip]="props().tooltip ?? ''"
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
  imports: [MatFormFieldModule, MatInputModule],
  selector: "adapt-assistant-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<mat-form-field appearance="outline" subscriptSizing="dynamic">
    <textarea
      matInput
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
    ></textarea>
  </mat-form-field>`,
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
  imports: [MatChipsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<mat-chip
    [attr.data-adapttable-part]="props().part"
    [attr.data-tone]="props().tone"
    [class]="props().className"
    >{{ props().label }}</mat-chip
  >`,
})
export class AdaptAssistantBadge {
  readonly props = input.required<TableAssistantBadgeProps>();
}

/** The in-flow conversation surface. @public */
@Component({
  selector: "adapt-assistant-panel",
  imports: [NgTemplateOutlet, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<mat-card
    role="region"
    [attr.aria-label]="props().label"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
  >
    <ng-container [ngTemplateOutlet]="props().children" />
  </mat-card>`,
})
export class AdaptAssistantPanel {
  readonly props = input.required<TableAssistantPanelProps>();
}

/** Material owns the sheet's backdrop, focus trap and focus restoration. @public */
@Component({
  selector: "adapt-assistant-sheet",
  imports: [NgTemplateOutlet, AdaptMaterialDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<adapt-material-dialog
    [open]="props().open"
    [sheet]="true"
    [label]="props().label"
    [dir]="props().dir ?? 'ltr'"
    (dismiss)="props().onClose()"
  >
    <section
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      style="padding:24px;overflow:auto"
    >
      <ng-container [ngTemplateOutlet]="props().children" /></section
  ></adapt-material-dialog>`,
})
export class AdaptAssistantSheet {
  readonly props = input.required<TableAssistantSheetProps>();
}

/** A nonmodal native dialog leaves the table behind it operable. @public */
@Component({
  selector: "adapt-assistant-window",
  imports: [NgTemplateOutlet, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<mat-card
    role="dialog"
    [attr.aria-label]="props().label"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    [style]="props().style"
    style="margin:0;padding:0;border:0"
  >
    <ng-container [ngTemplateOutlet]="props().children" />
  </mat-card>`,
})
export class AdaptAssistantWindow {
  readonly props = input.required<TableAssistantWindowProps>();
}

/** Native dictation language selection. @public */
@Component({
  imports: [MatFormFieldModule, MatInputModule],
  selector: "adapt-assistant-language-chip",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<mat-form-field appearance="outline" subscriptSizing="dynamic"
    ><select
      matNativeControl
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
    </select></mat-form-field
  >`,
})
export class AdaptAssistantLanguageChip {
  readonly props = input.required<TableAssistantLanguageChipProps>();
  protected changed(event: Event): void {
    this.props().onChange((event.target as HTMLSelectElement).value);
  }
}

/** Material examples menu owns keyboard navigation, Escape and focus restoration. @public */
@Component({
  selector: "adapt-assistant-menu",
  imports: [MatButtonModule, MatMenuModule, AdaptAssistantContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span data-adapttable-part="assistant-examples">
    <button
      mat-icon-button
      type="button"
      [matMenuTriggerFor]="examples"
      [attr.aria-label]="props().label"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      [disabled]="props().disabled === true"
    >
      <adapt-assistant-content [content]="props().icon" />
    </button>
    <mat-menu class="adapt-material-overlay" #examples="matMenu">
      <div
        class="adapt-material-assistant-examples-list"
        [style.max-height]="props().maxHeight"
        style="overflow:auto"
      >
        @for (item of props().items; track item.id) {
          <button
            mat-menu-item
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
        }
      </div></mat-menu
    ></span
  >`,
})
export class AdaptAssistantMenu {
  readonly props = input.required<TableAssistantMenuProps>();
  protected select(id: string): void {
    if (!this.props().disabled) this.props().onSelect(id);
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
  imports: [AdaptTableAssistantChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<adapt-table-assistant-chrome
    [props]="accented()"
    [slots]="slots"
  />`,
})
export class AdaptTableAssistant {
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
