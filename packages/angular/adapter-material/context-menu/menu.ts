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
} from "@adapttable/angular";
import { AdaptMaterialPopover } from "@adapttable/angular-material";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  type ElementRef,
  inject,
  input,
  viewChild,
} from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MatDividerModule } from "@angular/material/divider";

const SEPARATOR_PROPS = {};

/** One entry. */
@Component({
  imports: [MatButtonModule],
  selector: "adapt-context-menu-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-button
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
  imports: [MatDividerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-divider
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
  imports: [AdaptControl, AdaptMaterialPopover],
  template: `
    <span
      #origin
      [style.position]="'fixed'"
      [style.left.px]="props().at.x"
      [style.top.px]="props().at.y"
    ></span>
    <adapt-material-popover [origin]="origin" (dismiss)="props().onClose()">
      <div
        #menu
        role="menu"
        tabindex="-1"
        data-adapttable-part="context-menu"
        [attr.aria-label]="props().label"
        [class]="props().className"
        [style.min-width.px]="180"
        (keydown)="onKey($event)"
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
    </adapt-material-popover>
  `,
})
export class AdaptContextMenuSurface {
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
    afterNextRender(() => {
      this.entries()[0]?.focus();
    });
    effect((onCleanup) => {
      const dismiss = (event: MouseEvent): void => {
        const root = this.menu()?.nativeElement;
        if (!root?.contains(event.target as Node)) this.props().onClose();
      };
      document.addEventListener("mousedown", dismiss, true);
      onCleanup(() => {
        document.removeEventListener("mousedown", dismiss, true);
      });
    });
  }

  /** Arrows walk the entries. Escape closes. */
  protected onKey(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.props().onClose();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = this.entries();
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    items[(at + step + items.length) % items.length]?.focus();
  }

  private entries(): HTMLElement[] {
    return [
      ...(this.menu()?.nativeElement.querySelectorAll<HTMLElement>(
        '[role="menuitem"]'
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
export class AdaptContextMenuLive {
  /** The table's menu options. */
  readonly props = input.required<TableContextMenuOptions<unknown>>();
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
