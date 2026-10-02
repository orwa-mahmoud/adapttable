/**
 * The find bar and its toolbar button, drawn with native controls.
 */
import {
  AdaptFindBarChrome,
  ADAPTTABLE_FIND_STATE,
  type FindBarProps,
  type FindBarSlots,
  type FindButtonKind,
  type FindButtonProps,
  type FindSearchProps,
  type ToolbarExtrasSlotProps,
} from "@adapttable/angular";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  input,
  viewChild,
} from "@angular/core";

const FIND_GLYPH: Record<FindButtonKind, string> = {
  previous: "↑",
  next: "↓",
  close: "✕",
};

/** The search box the find bar focuses when it opens. @internal */
@Component({
  selector: "adapt-find-search",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      #box
      type="search"
      data-adapttable-part="find-input"
      [attr.aria-label]="props().label"
      [attr.placeholder]="props().placeholder"
      [value]="props().value"
      style="font: inherit; padding: 0.25em 0.5em; min-width: 12em"
      (input)="changed($event)"
      (keydown)="props().onKeyDown($event)"
    />
  `,
})
export class AdaptFindSearch {
  /** The search field's props. */
  readonly props = input.required<FindSearchProps>();
  private readonly box =
    viewChild.required<ElementRef<HTMLInputElement>>("box");

  constructor() {
    afterNextRender(() => {
      const element = this.box().nativeElement;
      this.props().focusRef({ focus: () => element.focus() });
    });
  }

  /** Report the typed value. */
  protected changed(event: Event): void {
    this.props().onChange((event.target as HTMLInputElement).value);
  }
}

/** Previous, next and close. @internal */
@Component({
  selector: "adapt-find-step",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [attr.data-adapttable-part]="props().part"
      [attr.aria-label]="props().label"
      [disabled]="props().disabled === true"
      style="border: 1px solid currentColor; border-radius: 0.25em; background: transparent; color: inherit; cursor: pointer; line-height: 1; padding: 0.25em 0.5em"
      (click)="props().onClick()"
    >
      {{ glyph() }}
    </button>
  `,
})
export class AdaptFindStep {
  /** Which find-bar button this is. */
  readonly props = input.required<FindButtonProps>();

  /** The glyph for this button. */
  protected glyph(): string {
    return FIND_GLYPH[this.props().kind];
  }
}

const SLOTS: FindBarSlots = { Search: AdaptFindSearch, Button: AdaptFindStep };

/**
 * The find bar, drawn with this kit's input and buttons.
 *
 * @public
 */
@Component({
  selector: "adapt-find-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptFindBarChrome],
  host: { style: "display: contents" },
  template: `
    <adapt-find-bar-chrome
      [find]="props().find"
      [labels]="props().labels"
      [className]="props().className"
      [slots]="slots"
    />
  `,
})
export class AdaptFindBar {
  /** The slot's props. */
  readonly props = input.required<FindBarProps>();
  /** This kit's search field and buttons. */
  protected readonly slots = SLOTS;
}

/**
 * A toolbar button that opens the find bar. Draws nothing outside a table
 * that composed find.
 *
 * @public
 */
@Component({
  selector: "adapt-find-toolbar-button",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (find?.(); as state) {
      @if (state.openBar; as openBar) {
        <button
          type="button"
          data-adapttable-part="find-button"
          [class]="props().classNames?.findButton"
          [attr.aria-expanded]="state.open"
          [attr.aria-label]="props().labels.findInTable"
          (click)="openBar()"
        >
          {{ props().labels.findInTable }}
        </button>
      }
    }
  `,
})
export class AdaptFindToolbarButton {
  /** The toolbar extras' props. */
  readonly props = input.required<ToolbarExtrasSlotProps>();
  /** The table's find state, when find is composed. */
  protected readonly find = inject(ADAPTTABLE_FIND_STATE, { optional: true });
}
