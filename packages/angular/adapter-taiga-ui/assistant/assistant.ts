import type { TableAssistantProps } from "@adapttable/angular";
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
  type TableAssistantSheetProps,
  type TableAssistantSlots,
  type TableAssistantWindowProps,
} from "@adapttable/angular/adapter";
import { ɵTAIGA_CONTROLS as TAIGA_CONTROLS } from "@adapttable/taiga-ui";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { TuiTitle } from "@taiga-ui/core";

/** Taiga UI assistant controls over the shared Angular Chrome. */

/** Every assistant action is a native button with an accessible name. @public */
@Component({
  selector: "adapt-assistant-button",
  imports: [...TAIGA_CONTROLS, AdaptAssistantContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<button
    tuiButton
    size="s"
    appearance="secondary"
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
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-assistant-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<tui-textfield
    tuiTextfieldSize="s"
    style="flex: 1; width: 100%; min-width: 0"
  >
    <textarea
      tuiTextarea
      [min]="2"
      [max]="5"
      [attr.aria-label]="props().label"
      [placeholder]="props().placeholder"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      [value]="props().value"
      [disabled]="props().disabled === true"
      style="width:100%;min-width:0;box-sizing:border-box;font:inherit;resize:none"
      (input)="changed($event)"
      (keydown)="props().onKeyDown($event)"
    ></textarea>
  </tui-textfield>`,
})
export class AdaptAssistantInput {
  readonly props = input.required<TableAssistantComposerProps>();
  protected changed(event: Event): void {
    this.props().onChange((event.target as HTMLTextAreaElement).value);
  }
}

/** Native connection badge. @public */
@Component({
  imports: [...TAIGA_CONTROLS],
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
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet],
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

/** Native modal owns top-layer stacking, focus containment and backdrop. @public */
@Component({
  selector: "adapt-assistant-sheet",
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet, TuiTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<ng-template
    [tuiDialog]="props().open"
    (tuiDialogChange)="!$event && props().onClose()"
    [tuiDialogOptions]="{ label: '', closable: false }"
    let-dialogId="id"
  >
    <section
      [attr.dir]="props().dir"
      [attr.data-adapttable-part]="props().part"
      style="block-size: 75dvh; min-block-size: 0; box-sizing: border-box"
      [class]="props().className"
    >
      <header>
        <hgroup tuiTitle>
          <h2
            [id]="dialogId"
            style="position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0"
          >
            {{ props().label }}
          </h2>
        </hgroup>
      </header>
      <ng-container [ngTemplateOutlet]="props().children" />
    </section>
  </ng-template>`,
})
export class AdaptAssistantSheet {
  // Native dialog options are captured on open. Its public template context
  // supplies the modal's aria-labelledby ID so this heading can stay reactive.
  readonly props = input.required<TableAssistantSheetProps>();
}

/** A nonmodal Taiga popup leaves the table behind it operable. @public */
@Component({
  selector: "adapt-assistant-window",
  imports: [...TAIGA_CONTROLS, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<ng-template [tuiPopup]="true"
    ><section
      role="dialog"
      [attr.aria-label]="props().label"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      [style]="props().style"
      style="margin:0;padding:0;border:0"
    >
      <ng-container [ngTemplateOutlet]="props().children" /></section
  ></ng-template>`,
})
export class AdaptAssistantWindow {
  readonly props = input.required<TableAssistantWindowProps>();
}

/** Native dictation language selection. @public */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-assistant-language-chip",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<tui-textfield
    [tuiTextfieldCleaner]="false"
    [stringify]="props().options | taigaLabels"
    [style.inline-size]="optionWidth()"
    style="max-inline-size: 100%; flex-shrink: 0"
    ><input
      tuiSelect
      [attr.aria-label]="props().label"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      [ngModel]="props().value"
      [disabled]="props().disabled === true"
      (ngModelChange)="changed($event)"
    /><tui-data-list *tuiDropdown>
      @for (option of props().options; track option.value) {
        <button tuiOption type="button" [value]="option.value">
          {{ option.label }}
        </button>
      }
    </tui-data-list></tui-textfield
  >`,
})
export class AdaptAssistantLanguageChip {
  readonly props = input.required<TableAssistantLanguageChipProps>();
  protected readonly optionWidth = computed(() => {
    const length = this.props().options.reduce(
      (longest, option) => Math.max(longest, option.label.length),
      0
    );
    return `calc(${String(length)}ch + 4rem)`;
  });
  protected changed(value: string | null): void {
    if (value !== null) this.props().onChange(value);
  }
}

/** The platform's disclosure keeps examples local and handles nested Escape. @public */
@Component({
  selector: "adapt-assistant-menu",
  imports: [...TAIGA_CONTROLS, AdaptAssistantContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<span
    #details
    data-adapttable-part="assistant-examples"
    (keydown)="onKeyDown($event)"
    ><button
      tuiButton
      size="s"
      appearance="secondary"
      type="button"
      [tuiDropdown]="menuContent"
      tuiDropdownRole="dialog"
      [adaptTaigaDropdownLabel]="props().label"
      [tuiDropdownOpen]="menuOpen()"
      [tuiDropdownEnabled]="!props().disabled"
      (tuiDropdownOpenChange)="menuOpen.set($event)"
      [attr.aria-expanded]="menuOpen()"
      #trigger
      [attr.aria-label]="props().label"
      [title]="props().label"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      [attr.aria-disabled]="props().disabled ? 'true' : null"
      (click)="onTrigger($event)"
    >
      <adapt-assistant-content [content]="props().icon" /></button
    ><ng-template #menuContent>
      <menu
        data-taiga-part="assistant-examples-list"
        [style.max-height]="props().maxHeight"
        style="overflow-y:auto"
      >
        @for (item of props().items; track item.id) {
          <li>
            <button
              tuiButton
              size="s"
              appearance="secondary"
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
    </ng-template></span
  >`,
})
export class AdaptAssistantMenu {
  protected readonly menuOpen = signal(false);
  readonly props = input.required<TableAssistantMenuProps>();
  private readonly trigger =
    viewChild.required<ElementRef<HTMLElement>>("trigger");
  constructor() {
    effect(() => {
      if (this.props().disabled) this.menuOpen.set(false);
    });
  }
  protected onTrigger(event: Event): void {
    if (this.props().disabled) event.preventDefault();
  }
  protected select(id: string): void {
    if (this.props().disabled) return;
    this.menuOpen.set(false);
    this.trigger().nativeElement.focus();
    this.props().onSelect(id);
  }
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape" && this.menuOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.menuOpen.set(false);
      this.trigger().nativeElement.focus();
    }
  }
}

/** Every control in the Taiga assistant, including its optional voice and examples. @public */
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

/** A complete Taiga assistant, directly mountable beside a table. @public */
@Component({
  selector: "adapt-table-assistant",
  imports: [...TAIGA_CONTROLS, AdaptTableAssistantChrome],
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
