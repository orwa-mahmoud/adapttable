/** Native HTML is this kit: buttons, textarea, disclosure and dialog. */
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
import {
  ɵbootstrapModal as bootstrapModal,
  ɵinjectBootstrapOverlayContainer as injectBootstrapOverlayContainer,
} from "@adapttable/ngx-bootstrap";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";
import {
  BsDropdownDirective,
  BsDropdownMenuDirective,
  BsDropdownToggleDirective,
} from "ngx-bootstrap/dropdown";

let nextSheetId = 0;

/** Every assistant action is a native button with an accessible name. @public */
@Component({
  selector: "adapt-assistant-button",
  imports: [AdaptAssistantContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-ngx-bootstrap", style: "display: contents" },
  template: `<button
    class="btn btn-outline-secondary btn-sm"
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
  selector: "adapt-assistant-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<textarea
    class="form-control form-control-sm"
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
    class="badge text-bg-secondary"
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
    class="card"
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

/** ngx-bootstrap modal owns focus containment and backdrop. @public */
@Component({
  selector: "adapt-assistant-sheet",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-ngx-bootstrap", style: "display: contents" },
  template: `<ng-template #content>
    <div
      style="height: 100%; min-height: 0; padding: 16px; box-sizing: border-box"
      [attr.aria-label]="props().label"
      [attr.dir]="props().dir"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
    >
      <span class="visually-hidden" [id]="titleId">{{ props().label }}</span>
      <ng-container [ngTemplateOutlet]="props().children" />
    </div>
  </ng-template>`,
})
export class AdaptAssistantSheet {
  readonly props = input.required<TableAssistantSheetProps>();
  protected readonly titleId = `adapt-ngx-bootstrap-assistant-${nextSheetId++}`;
  private readonly content =
    viewChild.required<TemplateRef<unknown>>("content");
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  constructor() {
    bootstrapModal({
      open: () => this.props().open,
      content: () => this.content(),
      container: () => this.element.nativeElement,
      titleId: this.titleId,
      sheet: true,
      onClose: () => this.props().onClose(),
    });
  }
}

/** A nonmodal native dialog leaves the table behind it operable. @public */
@Component({
  selector: "adapt-assistant-window",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<section
    class="card"
    role="dialog"
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
  selector: "adapt-assistant-language-chip",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-ngx-bootstrap", style: "display: contents" },
  template: `<select
    class="form-select form-select-sm"
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
  imports: [
    AdaptAssistantContent,
    BsDropdownDirective,
    BsDropdownMenuDirective,

    BsDropdownToggleDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `<div
    dropdown
    class="dropdown"
    [isDisabled]="props().disabled === true"
    [isAnimated]="false"
    [container]="overlayContainer()"
    [autoClose]="true"
    [insideClick]="true"
    #dropdown="bs-dropdown"
    data-adapttable-part="assistant-examples"
  >
    <button
      class="btn btn-outline-secondary btn-sm"
      type="button"
      dropdownToggle
      #trigger
      [attr.aria-label]="props().label"
      [title]="props().label"
      [attr.data-adapttable-part]="props().part"
      [class]="props().className"
      [disabled]="props().disabled === true"
    >
      <adapt-assistant-content [content]="props().icon" />
    </button>
    <div
      class="dropdown-menu"
      *dropdownMenu
      data-ngx-bootstrap-part="assistant-examples-list"
      (keydown.escape)="
        $event.preventDefault();
        $event.stopPropagation();
        dropdown.hide();
        trigger.focus()
      "
      [style.max-height]="props().maxHeight"
      style="overflow-y:auto"
    >
      @for (item of props().items; track item.id) {
        <li>
          <button
            class="dropdown-item"
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
    </div>
  </div>`,
})
export class AdaptAssistantMenu {
  protected readonly overlayContainer = injectBootstrapOverlayContainer();
  readonly props = input.required<TableAssistantMenuProps>();
  private readonly dropdown = viewChild.required(BsDropdownDirective);
  private readonly trigger =
    viewChild.required<ElementRef<HTMLElement>>("trigger");
  protected select(id: string): void {
    if (this.props().disabled) return;
    this.dropdown().hide();
    this.trigger().nativeElement.focus();
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
  host: { class: "adapttable-ngx-bootstrap", style: "display: contents" },
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
