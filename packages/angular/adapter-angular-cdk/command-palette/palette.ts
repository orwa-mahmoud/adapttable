/**
 * The command palette and its toolbar button, drawn with native controls.
 */
import {
  AdaptCommandPaletteChrome,
  ADAPTTABLE_PALETTE_OPEN,
  type CommandPaletteInjectOptions,
  type CommandPaletteSlots,
  type CommandPaletteSurfaceProps,
  injectCommandPalette,
  type ToolbarExtrasSlotProps,
} from "@adapttable/angular/adapter";
import { A11yModule } from "@angular/cdk/a11y";
import { Overlay, OverlayModule } from "@angular/cdk/overlay";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  input,
  viewChild,
} from "@angular/core";

/** The native dialog surface; the binding keeps its keyboard and focus model. */
@Component({
  selector: "adapt-command-surface",
  imports: [A11yModule, OverlayModule, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <span cdkOverlayOrigin #origin="cdkOverlayOrigin"></span>
    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="true"
      [cdkConnectedOverlayHasBackdrop]="true"
      [cdkConnectedOverlayDisableClose]="true"
      [cdkConnectedOverlayScrollStrategy]="scrollStrategy"
      cdkConnectedOverlayBackdropClass="adapt-cdk-backdrop"
      cdkConnectedOverlayPanelClass="adapt-cdk-modal-overlay"
      (backdropClick)="props().onClose()"
      (overlayKeydown)="keydown($event)"
    >
      <div
        role="dialog"
        cdkTrapFocus
        [cdkTrapFocusAutoCapture]="true"
        class="adapt-cdk-surface"
        aria-modal="true"
        [attr.aria-label]="props().label"
        [class]="props().className"
        [attr.dir]="props().dir"
        data-adapttable-part="command-palette"
        style="min-inline-size: min(360px, 100%); max-inline-size: 520px; inline-size: 100%"
      >
        <ng-container [ngTemplateOutlet]="props().children ?? null" />
      </div>
    </ng-template>
  `,
})
class AdaptCommandSurface {
  protected readonly scrollStrategy = inject(Overlay).scrollStrategies.block();
  readonly props = input.required<CommandPaletteSurfaceProps>();
  protected keydown(event: KeyboardEvent): void {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    this.props().onClose();
  }
}

/** The search box. @internal */
@Component({
  imports: [A11yModule],
  selector: "adapt-command-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      cdkMonitorElementFocus
      data-adapttable-cdk-control
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
      style="font: inherit; width: 100%; padding: 0.5em; box-sizing: border-box"
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
  imports: [A11yModule],
  selector: "adapt-command-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      cdkMonitorElementFocus
      data-adapttable-cdk-control
      type="button"
      data-adapttable-part="command-item"
      role="option"
      [id]="props().itemProps.id"
      [attr.aria-selected]="props().itemProps['aria-selected']"
      [attr.aria-disabled]="props().itemProps['aria-disabled']"
      [disabled]="props().command.disabled === true"
      [attr.data-active]="props().active ? '' : null"
      style="display: block; width: 100%; text-align: start; border: 0; background: transparent; color: inherit; font: inherit; padding: 0.4em 0.6em; cursor: pointer"
      (click)="props().itemProps.onClick()"
      (mouseenter)="props().itemProps.onMouseEnter()"
    >
      {{ props().command.label }}
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p data-adapttable-part="command-empty">{{ props().message }}</p>
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
      [dir]="props().dir"
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
  imports: [A11yModule],
  selector: "adapt-command-palette-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open?.(); as state) {
      <button
        cdkMonitorElementFocus
        data-adapttable-cdk-control
        type="button"
        data-adapttable-part="command-palette-button"
        aria-haspopup="dialog"
        [attr.aria-expanded]="state.open"
        (click)="state.setOpen(true)"
      >
        {{ props().labels.commandPalette }}
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
