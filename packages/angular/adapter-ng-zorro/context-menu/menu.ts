/**
 * The context menu, drawn with NG-ZORRO controls.
 */
import {
  AdaptContextMenuChrome,
  AdaptControl,
  ADAPTTABLE_CONTEXT_MENU,
  type ContextMenuSlots,
  injectTableContextMenu,
  type TableContextMenuOptions,
} from "@adapttable/angular/adapter";
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzDividerModule } from "ng-zorro-antd/divider";
import { NzPopoverModule } from "ng-zorro-antd/popover";

const SEPARATOR_PROPS = {};

/** One entry. */
@Component({
  selector: "adapt-context-menu-item",
  imports: [NzButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      nz-button
      nzType="text"
      type="button"
      role="menuitem"
      [tabIndex]="-1"
      data-adapttable-part="context-menu-item"
      [disabled]="props().item.disabled === true"
      [nzDanger]="props().item.danger === true"
      [attr.data-danger]="props().item.danger === true ? '' : null"
      style="display: block; width: 100%; text-align: start"
      (click)="props().onSelect()"
    >
      <span>{{ props().item.label }} </span>
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
  imports: [NzDividerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <nz-divider data-adapttable-part="context-menu-separator" /> `,
})
export class AdaptContextMenuSeparator {
  /** Present so the chrome can hand every slot a props input. */
  readonly props = input.required<object>();
}

/** The menu surface: focus, the arrow walk, and the outside press. */
@Component({
  selector: "adapt-context-menu-surface",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl, NzCardModule, NzPopoverModule],
  template: `
    <span
      nz-popover
      aria-hidden="true"
      [dir]="direction()"
      [nzPopoverTrigger]="null"
      [nzPopoverVisible]="true"
      [nzPopoverBackdrop]="false"
      [nzPopoverContent]="content"
      [nzPopoverPlacement]="
        direction() === 'rtl' ? 'bottomRight' : 'bottomLeft'
      "
      [nzPopoverOverlayStyle]="overlayStyle"
      [style.position]="'fixed'"
      [style.left.px]="props().at.x"
      [style.top.px]="props().at.y"
      style="width: 1px; height: 1px; pointer-events: none"
    ></span>
    <ng-template #content>
      <div
        #menu
        role="menu"
        tabindex="-1"
        data-adapttable-part="context-menu"
        [attr.aria-label]="props().label"
        [class]="props().className"
        [dir]="direction()"
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
    </ng-template>
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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly direction = signal<"ltr" | "rtl">("ltr");
  protected readonly overlayStyle = { zIndex: "10050" };
  /** The divider takes no fields. */
  protected readonly separatorProps = SEPARATOR_PROPS;

  constructor() {
    afterRenderEffect(() => {
      this.direction.set(
        this.host.nativeElement.closest<HTMLElement>("[dir]")?.dir === "rtl"
          ? "rtl"
          : "ltr"
      );
      if (this.menu()) this.entries()[0]?.focus();
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
        '[role="menuitem"]:not([disabled])'
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
export class AdaptContextMenuLive<TRow> {
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
