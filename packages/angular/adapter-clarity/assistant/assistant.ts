/** Clarity controls fill every assistant slot. */
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
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  viewChild,
} from "@angular/core";
import {
  ClrDropdown,
  ClrDropdownModule,
  ClrModalModule,
  ClrSelectModule,
  ClrTextareaModule,
} from "@clr/angular";

/** Every assistant action is a native button with an accessible name. @public */
@Component({
  selector: "adapt-assistant-button",
  imports: [AdaptAssistantContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
  template: `<button
    class="btn btn-sm btn-outline"
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
  imports: [ClrTextareaModule],
  selector: "adapt-assistant-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
  template: `<textarea
    clrTextarea
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
  host: { class: "adapttable-clarity", style: "display: contents" },
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
  host: { class: "adapttable-clarity", style: "display: contents" },
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

/** Clarity owns modal focus containment, backdrop and Escape. @public */
@Component({
  selector: "adapt-assistant-sheet",
  imports: [NgTemplateOutlet, ClrModalModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
  template: `<clr-modal
    [clrModalOpen]="props().open"
    [clrModalSkipAnimation]="true"
    [clrModalCloseButtonAriaLabel]="props().label"
    [clrModalStaticBackdrop]="false"
    (clrModalOpenChange)="!$event && props().onClose()"
  >
    <h3 class="modal-title">{{ props().label }}</h3>
    <div
      class="modal-body"
      [attr.aria-label]="props().label"
      [attr.dir]="props().dir"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
    >
      <ng-container [ngTemplateOutlet]="props().children" />
    </div>
  </clr-modal>`,
})
export class AdaptAssistantSheet {
  readonly props = input.required<TableAssistantSheetProps>();
}

/** A nonmodal native dialog leaves the table behind it operable. @public */
@Component({
  selector: "adapt-assistant-window",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
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
  imports: [ClrSelectModule],
  selector: "adapt-assistant-language-chip",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
  template: `<select
    clrSelect
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

/** The platform's disclosure keeps examples local and handles nested Escape. @public */
@Component({
  selector: "adapt-assistant-menu",
  imports: [AdaptAssistantContent, ClrDropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
  template: `<clr-dropdown
    #details
    data-adapttable-part="assistant-examples"
    (keydown)="onKeyDown($event)"
  >
    <button
      clrDropdownTrigger
      class="btn btn-sm btn-outline"
      type="button"
      [disabled]="props().disabled === true"
      #trigger
      [attr.aria-label]="props().label"
      [title]="props().label"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      [attr.aria-disabled]="props().disabled ? 'true' : null"
      (click)="onTrigger($event)"
    >
      <adapt-assistant-content [content]="props().icon" />
    </button>
    <clr-dropdown-menu *clrIfOpen clrPosition="top-left">
      <menu
        data-clarity-part="assistant-examples-list"
        [style.max-height]="props().maxHeight"
        style="overflow-y:auto"
      >
        @for (item of props().items; track item.id) {
          <li>
            <button
              class="btn btn-sm btn-outline"
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
    </clr-dropdown-menu>
  </clr-dropdown>`,
})
export class AdaptAssistantMenu {
  readonly props = input.required<TableAssistantMenuProps>();
  private readonly details = viewChild.required<ClrDropdown>("details");
  private readonly trigger =
    viewChild.required<ElementRef<HTMLElement>>("trigger");
  protected onTrigger(event: Event): void {
    if (this.props().disabled) event.preventDefault();
  }
  protected select(id: string): void {
    if (this.props().disabled) return;
    this.details().popoverService.open = false;
    this.trigger().nativeElement.focus();
    this.props().onSelect(id);
  }
  protected onKeyDown(event: KeyboardEvent): void {
    const details = this.details().popoverService;
    if (event.key === "Escape" && details.open) {
      event.preventDefault();
      event.stopPropagation();
      details.open = false;
      this.trigger().nativeElement.focus();
    }
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
  host: { class: "adapttable-clarity", style: "display: contents" },
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
