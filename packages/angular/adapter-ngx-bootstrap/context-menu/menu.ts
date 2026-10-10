/**
 * The context menu, drawn with native controls.
 */
import {
  AdaptContextMenuChrome,
  AdaptControl,
  ADAPTTABLE_CONTEXT_MENU,
  type ContextMenuSlots,
  injectTableContextMenu,
  type TableContextMenuOptions,
} from "@adapttable/angular/adapter";
import { ɵinjectBootstrapOverlayContainer as injectBootstrapOverlayContainer } from "@adapttable/ngx-bootstrap";
import {
  afterEveryRender,
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from "@angular/core";
import {
  BsDropdownDirective,
  BsDropdownMenuDirective,
  BsDropdownToggleDirective,
} from "ngx-bootstrap/dropdown";

const SEPARATOR_PROPS = {};

/** One entry. */
@Component({
  selector: "adapt-context-menu-item",

  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="dropdown-item"
      type="button"
      role="menuitem"
      tabindex="-1"
      data-adapttable-part="context-menu-item"
      [disabled]="props().item.disabled === true"
      [attr.data-danger]="props().item.danger === true ? '' : null"
      style="display: block; width: 100%; text-align: start; border: 0; background: transparent; color: inherit; font: inherit; padding: 0.4em 0.6em; cursor: pointer"
      (click)="props().onSelect()"
    >
      {{ props().item.label }}
    </button>
  `,
})
export class AdaptContextMenuItem {
  /** The entry and the action that closes the menu first. */
  readonly props = input.required<{
    readonly item: {
      readonly label: string;
      readonly disabled?: boolean;
      readonly danger?: boolean;
    };
    readonly onSelect: () => void;
  }>();
}

/** The divider between groups of entries. */
@Component({
  selector: "adapt-context-menu-separator",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <hr
      data-adapttable-part="context-menu-separator"
      style="border: 0; border-top: 1px solid currentColor"
    />
  `,
})
export class AdaptContextMenuSeparator {
  /** Present so the chrome can hand every slot a props input. */
  readonly props = input.required<object>();
}

/** The menu surface: focus, the arrow walk, and the outside press. */
@Component({
  selector: "adapt-context-menu-surface",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdaptControl,
    BsDropdownDirective,
    BsDropdownToggleDirective,
    BsDropdownMenuDirective,
  ],
  template: `
    <div
      dropdown
      [style.position]="'fixed'"
      [style.left.px]="props().at.x"
      [style.top.px]="props().at.y"
      [isAnimated]="false"
      [container]="overlayContainer()"
      [isOpen]="ready()"
      [autoClose]="true"
      [insideClick]="true"
      (isOpenChange)="closed($event)"
    >
      <span
        dropdownToggle
        tabindex="-1"
        [style.position]="'fixed'"
        [style.left.px]="props().at.x"
        [style.top.px]="props().at.y"
      ></span>
      <div
        class="dropdown-menu"
        *dropdownMenu
        #menu
        (keydown)="onKeyDown($event)"
        role="menu"
        tabindex="-1"
        data-adapttable-part="context-menu"
        [attr.aria-label]="props().label"
        [class]="props().className"
      >
        @for (row of props().rows; track row.item.key) {
          @if (row.item.separatorBefore === true) {
            <ng-container
              [adaptControl]="props().Separator"
              [adaptControlProps]="separatorProps"
            />
          }
          <ng-container
            [adaptControl]="props().Item"
            [adaptControlProps]="row"
          />
        }
      </div>
    </div>
  `,
})
export class AdaptContextMenuSurface {
  protected readonly overlayContainer = injectBootstrapOverlayContainer();
  protected readonly ready = signal(false);
  /** The chrome's surface props. */
  readonly props = input.required<{
    readonly at: { readonly x: number; readonly y: number };
    readonly label: string;
    readonly onClose: () => void;
    readonly className?: string;
    readonly rows: readonly {
      readonly item: {
        readonly key: string;
        readonly separatorBefore?: boolean;
      };
      readonly onSelect: () => void;
    }[];
    readonly Item: ContextMenuSlots["Item"];
    readonly Separator: ContextMenuSlots["Separator"];
  }>();
  private readonly menu = viewChild<ElementRef<HTMLElement>>("menu");
  /** The divider takes no fields. */
  protected readonly separatorProps = SEPARATOR_PROPS;

  constructor() {
    // The portal boundary is selected after rendering. Opening before then
    // makes ngx-bootstrap create an inline view that cannot move with it.
    afterNextRender(() => this.ready.set(true));
    let focused = false;
    afterEveryRender(() => {
      const first = this.entries()[0];
      if (!focused && first) {
        focused = true;
        first.focus();
      }
    });
  }

  protected closed(open: boolean): void {
    if (!open) this.props().onClose();
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.props().onClose();
      return;
    }
    const entries = this.entries();
    if (!entries.length) return;
    const current = entries.indexOf(
      this.menu()?.nativeElement.ownerDocument.activeElement as HTMLElement
    );
    let next: number;
    switch (event.key) {
      case "ArrowDown":
        next = (current + 1) % entries.length;
        break;
      case "ArrowUp":
        next = (current - 1 + entries.length) % entries.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = entries.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    entries[next]?.focus();
  }

  private entries(): HTMLElement[] {
    return [
      ...(this.menu()?.nativeElement.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled]):not([aria-disabled="true"])'
      ) ?? []),
    ];
  }
}

const SLOTS: ContextMenuSlots = {
  Surface: AdaptContextMenuSurface,
  Item: AdaptContextMenuItem,
  Separator: AdaptContextMenuSeparator,
};

/**
 * The live menu: it follows {@link injectTableContextMenu}, publishes the
 * region handlers, and draws the chrome.
 */
@Component({
  selector: "adapt-context-menu-live",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptContextMenuChrome],
  template: `
    <adapt-context-menu-chrome
      [items]="menu().items"
      [at]="menu().at"
      [onClose]="menu().close"
      [labels]="props().labels"
      [slots]="slots"
    />
  `,
})
export class AdaptContextMenuLive<TRow = unknown> {
  /** The table's menu options. */
  readonly props = input.required<TableContextMenuOptions<TRow>>();
  private readonly options = computed(() => this.props());
  /** The open state, the entries and the region handlers. */
  readonly menu = injectTableContextMenu(this.options);
  /** The kit's surface, entries and divider. */
  readonly slots = SLOTS;
  private readonly region = inject(ADAPTTABLE_CONTEXT_MENU, { optional: true });

  constructor() {
    effect((onCleanup) => {
      this.region?.set(this.menu().region);
      onCleanup(() => {
        this.region?.set(null);
      });
    });
  }
}
