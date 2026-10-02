/**
 * The command palette and its toolbar button, drawn with NG-ZORRO controls.
 */
import {
  AdaptCommandPaletteChrome,
  ADAPTTABLE_PALETTE_OPEN,
  type CommandPaletteInjectOptions,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
  injectCommandPalette,
  type ToolbarExtrasSlotProps,
} from "@adapttable/angular";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  input,
  viewChild,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzInputModule } from "ng-zorro-antd/input";
import {
  NzModalComponent,
  NzModalModule,
  NzModalService,
} from "ng-zorro-antd/modal";
import { NzTypographyModule } from "ng-zorro-antd/typography";

/** The NG-ZORRO modal surface; the binding keeps its keyboard and focus model. */
@Component({
  selector: "adapt-command-surface",
  imports: [NgTemplateOutlet, NzModalModule],
  providers: [NzModalService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <nz-modal
      #modal
      [nzVisible]="true"
      [nzClosable]="false"
      [nzFooter]="null"
      [nzKeyboard]="false"
      [nzAutofocus]="null"
      [nzWidth]="520"
      [nzZIndex]="10050"
      [nzWrapClassName]="props().className"
      (nzOnCancel)="props().onClose()"
      (nzAfterOpen)="focusInput()"
    >
      <ng-container *nzModalContent>
        <ng-container [ngTemplateOutlet]="props().children ?? null" />
      </ng-container>
    </nz-modal>
  `,
})
class AdaptCommandSurface {
  readonly props = input.required<CommandPaletteSurfaceProps>();
  private readonly modal = viewChild(NzModalComponent);

  constructor() {
    afterRenderEffect((onCleanup) => {
      const element = this.modal()?.getElement();
      if (!element) return;
      element.setAttribute("data-adapttable-part", "command-palette");
      element.setAttribute("aria-label", this.props().label);
      element.setAttribute("aria-modal", "true");
      const onKey = (event: KeyboardEvent): void => {
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        this.props().onClose();
      };
      element.addEventListener("keydown", onKey);
      onCleanup(() => element.removeEventListener("keydown", onKey));
    });
  }

  /** The modal focuses its host while opening; return focus after it settles. */
  protected focusInput(): void {
    this.modal()
      ?.getElement()
      ?.querySelector<HTMLInputElement>(
        '[data-adapttable-part="command-input"]'
      )
      ?.focus();
  }
}

/** The search box. @internal */
@Component({
  selector: "adapt-command-input",
  imports: [NzInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      nz-input
      #box
      type="text"
      data-adapttable-part="command-input"
      role="combobox"
      aria-expanded="true"
      [attr.aria-controls]="field()['aria-controls']"
      [attr.aria-activedescendant]="field()['aria-activedescendant']"
      [attr.aria-label]="field()['aria-label']"
      [attr.placeholder]="field().placeholder"
      [value]="field().value"
      style="width: 100%"
      (input)="changed($event)"
      (keydown)="field().onKeyDown($event)"
    />
  `,
})
export class AdaptCommandInput {
  /** The combobox props the chrome computed. */
  readonly props = input.required<{
    readonly inputProps: {
      readonly value: string;
      readonly onChange: (next: string) => void;
      readonly onKeyDown: (event: KeyboardEvent) => void;
      readonly ref: (element: HTMLInputElement | null) => void;
      readonly "aria-controls": string;
      readonly "aria-activedescendant": string | undefined;
      readonly "aria-label": string;
      readonly placeholder: string;
    };
  }>();
  private readonly box =
    viewChild.required<ElementRef<HTMLInputElement>>("box");
  /** The input's own props. */
  protected readonly field = computed(() => this.props().inputProps);

  constructor() {
    afterNextRender(() => {
      this.field().ref(this.box().nativeElement);
    });
  }

  /** Report the typed value. */
  protected changed(event: Event): void {
    this.field().onChange((event.target as HTMLInputElement).value);
  }
}

/** One command. @internal */
@Component({
  selector: "adapt-command-item",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      nz-button
      type="button"
      data-adapttable-part="command-item"
      role="option"
      [tabIndex]="-1"
      nzType="text"
      [id]="props().itemProps.id"
      [attr.aria-selected]="props().itemProps['aria-selected']"
      [attr.aria-disabled]="props().itemProps['aria-disabled']"
      [disabled]="props().command.disabled === true"
      [attr.data-active]="props().active ? '' : null"
      style="display: block; width: 100%; text-align: start"
      (click)="props().itemProps.onClick()"
      (mouseenter)="props().itemProps.onMouseEnter()"
    >
      <span>{{ props().command.label }} </span>
    </button>
  `,
})
export class AdaptCommandItem {
  /** The row's props. */
  readonly props = input.required<{
    readonly command: { readonly label: string; readonly disabled?: boolean };
    readonly active: boolean;
    readonly itemProps: {
      readonly id: string;
      readonly "aria-selected": boolean;
      readonly "aria-disabled": boolean | undefined;
      readonly onClick: () => void;
      readonly onMouseEnter: () => void;
    };
  }>();
}

/** Shown when the query matches nothing. @internal */
@Component({
  selector: "adapt-command-empty",
  imports: [NzTypographyModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p nz-typography data-adapttable-part="command-empty">
      {{ props().message }}
    </p>
  `,
})
export class AdaptCommandEmpty {
  /** The empty line. */
  readonly props = input.required<{ readonly message: string }>();
}

const SLOTS: CommandPaletteSlots = {
  Surface: AdaptCommandSurface,
  Input: AdaptCommandInput,
  Item: AdaptCommandItem,
  Empty: AdaptCommandEmpty,
};

/**
 * The live palette: it follows {@link injectCommandPalette} and draws the
 * chrome. A feature fills the command-palette slot with this component.
 */
@Component({
  selector: "adapt-command-palette-live",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptCommandPaletteChrome],
  template: `
    <adapt-command-palette-chrome
      [commands]="palette().commands"
      [open]="palette().open"
      [onClose]="palette().close"
      [labels]="props().labels"
      [slots]="slots"
    />
  `,
})
export class AdaptCommandPaletteLive {
  /** The table's palette options. */
  readonly props = input.required<CommandPaletteInjectOptions>();
  private readonly options = computed(() => this.props());
  /** The open state and the commands. */
  readonly palette = injectCommandPalette(this.options);
  /** The kit's input, rows and empty line. */
  readonly slots = SLOTS;
}

/** A toolbar control that opens the palette. */
@Component({
  selector: "adapt-command-palette-button",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open?.(); as state) {
      <button
        nz-button
        type="button"
        data-adapttable-part="command-palette-button"
        aria-haspopup="dialog"
        [attr.aria-expanded]="state.open"
        (click)="state.setOpen(true)"
      >
        <span>{{ props().labels.commandPalette }} </span>
      </button>
    }
  `,
})
export class AdaptCommandPaletteButton {
  /** The toolbar's props. */
  readonly props = input.required<ToolbarExtrasSlotProps>();
  /** The palette, when one is armed. */
  readonly open = inject(ADAPTTABLE_PALETTE_OPEN, { optional: true });
}
