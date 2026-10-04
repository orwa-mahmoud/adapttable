/** Native HTML is this kit: buttons, textarea, disclosure and dialog. */
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
import {
  ɵHlmButton as HlmButton,
  ɵHlmInput as HlmInput,
  ɵHlmNativeOption as HlmNativeOption,
  ɵHlmNativeSelect as HlmNativeSelect,
  ɵHlmPopoverLabel as HlmPopoverLabel,
} from "@adapttable/spartan";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  viewChild,
} from "@angular/core";
import {
  BrnDialog,
  BrnDialogContent,
  BrnDialogTitle,
} from "@spartan-ng/brain/dialog";
import {
  BrnPopover,
  BrnPopoverContent,
  BrnPopoverTrigger,
} from "@spartan-ng/brain/popover";

/** Every assistant action is a native button with an accessible name. @public */
@Component({
  selector: "adapt-assistant-button",
  imports: [HlmButton, AdaptAssistantContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<button
    adaptHlmButton
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
  imports: [HlmInput],
  selector: "adapt-assistant-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<textarea
    adaptHlmInput
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

/** Modal assistant with Spartan focus containment and backdrop. @public */
@Component({
  selector: "adapt-assistant-sheet",
  imports: [NgTemplateOutlet, BrnDialog, BrnDialogContent, BrnDialogTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<div
    brnDialog
    [state]="props().open ? 'open' : 'closed'"
    (stateChanged)="$event === 'closed' && props().onClose()"
  >
    <ng-template brnDialogContent>
      <h2
        brnDialogTitle
        style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0"
      >
        {{ props().label }}
      </h2>
      <section
        class="at-spartan-surface at-spartan-popover"
        data-adapttable-kit="spartan"
        [attr.dir]="props().dir"
        [attr.data-adapttable-part]="props().part"
        style="inline-size: min(420px, calc(100vw - 16px)); block-size: 80dvh; max-block-size: 80dvh; min-block-size: 0; box-sizing: border-box"
        [class]="props().className"
      >
        <ng-container [ngTemplateOutlet]="props().children" />
      </section>
    </ng-template>
  </div>`,
})
export class AdaptAssistantSheet {
  readonly props = input.required<TableAssistantSheetProps>();
}

/** A nonmodal native dialog leaves the table behind it operable. @public */
@Component({
  selector: "adapt-assistant-window",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<section
    role="dialog"
    class="at-spartan-surface"
    data-adapttable-kit="spartan"
    [attr.aria-label]="props().label"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    [style]="props().style"
    style="margin:0;padding:0;border:0"
  >
    <ng-container [ngTemplateOutlet]="props().children" />
  </section>`,
})
export class AdaptAssistantWindow {
  readonly props = input.required<TableAssistantWindowProps>();
}

/** Native dictation language selection. @public */
@Component({
  imports: [HlmNativeSelect, HlmNativeOption],
  selector: "adapt-assistant-language-chip",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<select
    adaptHlmNativeSelect
    [attr.aria-label]="props().label"
    [attr.data-adapttable-part]="props().part"
    [class]="props().className"
    [value]="props().value"
    [disabled]="props().disabled === true"
    (change)="changed($event)"
  >
    @for (option of props().options; track option.value) {
      <option adaptHlmNativeOption [value]="option.value">
        {{ option.label }}
      </option>
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
  imports: [
    HlmButton,
    AdaptAssistantContent,
    BrnPopover,
    HlmPopoverLabel,
    BrnPopoverContent,
    BrnPopoverTrigger,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<div
    brnPopover
    [adaptHlmPopoverLabel]="props().label"
    #details="brnPopover"
    data-adapttable-part="assistant-examples"
  >
    <button
      adaptHlmButton
      brnPopoverTrigger
      #trigger
      [attr.aria-label]="props().label"
      [title]="props().label"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      [attr.aria-disabled]="props().disabled ? 'true' : null"
      [disabled]="props().disabled === true"
    >
      <adapt-assistant-content [content]="props().icon" /></button
    ><ng-template brnPopoverContent>
      <menu
        class="at-spartan-surface at-spartan-popover"
        data-adapttable-kit="spartan"
        data-spartan-part="assistant-examples-list"
        [style.max-height]="props().maxHeight"
        style="overflow-y:auto"
      >
        @for (item of props().items; track item.id) {
          <li>
            <button
              adaptHlmButton
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
  </div>`,
})
export class AdaptAssistantMenu {
  readonly props = input.required<TableAssistantMenuProps>();
  private readonly details = viewChild.required<BrnPopover>("details");
  protected select(id: string): void {
    if (this.props().disabled) return;
    this.details().close();
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
