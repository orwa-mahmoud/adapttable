/**
 * The Columns menu: a disclosure button and a panel where each column has a
 * reorder grip, an eye toggle, a pin toggle and a submenu of actions — drawn
 * with native controls, over the menu model in `@adapttable/angular`.
 */
import {
  AdaptAttrs,
  AdaptColumnMenuEdgeRowModel,
  AdaptColumnMenuModel,
  AdaptColumnMenuRowModel,
  AdaptIcon,
  AdaptLiveRegion,
  injectPopoverSpace,
} from "@adapttable/angular/adapter";
import {
  afterNextRender,
  afterRenderEffect,
  type AfterRenderRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from "@angular/core";
import {
  BsDropdownDirective,
  BsDropdownMenuDirective,
} from "ngx-bootstrap/dropdown";

import { injectBootstrapOverlayContainer } from "./bootstrapOverlay";

/** The menu's props, with the row type erased as every slot erases it. */

/** Whether a submenu item is a choice rather than a plain action. */

/**
 * One column's row: grip, eye, name, pin, and the "more" submenu with the
 * rename editor.
 *
 * @internal
 */
@Component({
  selector: "adapt-column-menu-row",
  imports: [AdaptAttrs, AdaptIcon, AdaptLiveRegion],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let r = row();
    @let p = props();
    <div
      data-adapttable-part="column-menu-item"
      [attr.data-hidden]="r.hidden ? '' : null"
      [attr.data-pinned]="r.pinned ?? null"
      [style.cursor]="r.canMove ? 'grab' : 'default'"
      [adaptAttrs]="
        r.canMove ? drag().rowAttrs(r.key, r.index, p.layout.move) : {}
      "
    >
      <span
        data-ngx-bootstrap-part="column-menu-grip"
        [attr.aria-disabled]="r.canMove ? null : 'true'"
        [adaptAttrs]="
          r.canMove
            ? drag().gripAttrs(
                r.key,
                r.index,
                p.layout.move,
                p.labels.moveStart + ' / ' + p.labels.moveEnd + ': ' + r.name
              )
            : {}
        "
        ><svg [adaptIcon]="gripIcon"></svg
      ></span>
      <button
        class="btn btn-outline-secondary btn-sm"
        type="button"
        data-ngx-bootstrap-part="column-menu-visibility"
        [attr.data-active]="r.hidden ? null : ''"
        [attr.aria-pressed]="!r.hidden"
        [attr.aria-label]="
          (r.hidden ? p.labels.showColumn : p.labels.hideColumn) + ': ' + r.name
        "
        [disabled]="!r.canHide"
        (click)="p.layout.toggleVisible(r.key)"
      >
        <svg [adaptIcon]="r.hidden ? eyeOff : eyeOn"></svg>
      </button>
      <span
        data-ngx-bootstrap-part="column-menu-label"
        [attr.data-hidden]="r.hidden ? '' : null"
        >{{ r.name }}</span
      >
      <button
        class="btn btn-sm"
        [class.btn-primary]="r.pinned !== undefined"
        [class.btn-outline-secondary]="!(r.pinned !== undefined)"
        type="button"
        data-ngx-bootstrap-part="column-menu-pin"
        [attr.data-active]="r.pinned !== undefined ? '' : null"
        [attr.aria-pressed]="r.pinned !== undefined"
        [attr.aria-label]="pinLabel(r, p) + ': ' + r.name"
        [disabled]="!r.canPin"
        (click)="p.layout.setPinned(r.key, nextPin(r))"
      >
        <svg [adaptIcon]="pinIcon"></svg>
      </button>
      <button
        class="btn btn-outline-secondary btn-sm"
        type="button"
        data-adapttable-part="column-menu-more"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="p.labels.columnActions + ': ' + r.name"
        (click)="open.set(!open())"
      >
        ⋯
      </button>
      @if (open()) {
        <div data-adapttable-part="column-menu-submenu">
          @for (item of actions(); track item.id) {
            @if (asChoice(item); as choice) {
              <label data-adapttable-part="column-menu-choice">
                <span data-ngx-bootstrap-part="column-menu-choice-label">{{
                  choice.label
                }}</span>
                <select
                  class="form-select form-select-sm"
                  data-ngx-bootstrap-part="column-menu-choice-select"
                  [attr.aria-label]="choice.label"
                  [value]="choice.value"
                  [disabled]="choice.disabled"
                  (change)="choice.onChange($any($event.target).value)"
                >
                  @for (option of choice.options; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </label>
            } @else {
              <button
                class="btn btn-outline-secondary btn-sm"
                type="button"
                data-adapttable-part="column-menu-action"
                [disabled]="
                  asAction(item).disabled ||
                  (item.id === 'rename' && rename.editing())
                "
                (click)="runAction(item)"
              >
                {{ item.label }}
              </button>
            }
          }
          @if (rename.editing()) {
            <form
              data-adapttable-part="column-rename-form"
              (submit)="$event.preventDefault(); rename.submit()"
            >
              <label
                data-adapttable-part="column-rename-label"
                [attr.for]="rename.inputId"
                >{{ p.labels.columnName }}</label
              >
              <input
                class="form-control form-control-sm"
                data-adapttable-part="column-rename-input"
                [adaptAttrs]="rename.inputAttrs()"
              />
              @if (rename.error(); as error) {
                <span
                  data-adapttable-part="column-rename-error"
                  role="alert"
                  [attr.id]="rename.errorId"
                  >{{ error }}</span
                >
              }
              <button
                class="btn btn-outline-secondary btn-sm"
                type="submit"
                data-adapttable-part="column-rename-save"
              >
                {{ p.labels.saveColumnName }}
              </button>
              <button
                class="btn btn-outline-secondary btn-sm"
                type="button"
                data-adapttable-part="column-rename-cancel"
                (click)="rename.cancel()"
              >
                {{ p.labels.cancelColumnRename }}
              </button>
            </form>
          }
        </div>
      }
      <div
        [adaptLiveRegion]="rename.announcement()"
        part="column-rename-announcer"
      ></div>
    </div>
  `,
})
export class AdaptColumnMenuRow extends AdaptColumnMenuRowModel {}

/**
 * A reserved column's row — row actions or the reorder grip — with its eye
 * and a one-click pin to the edge it always sits at.
 *
 * @internal
 */
@Component({
  selector: "adapt-column-menu-edge-row",
  imports: [AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let hidden = layout().isHidden(columnKey());
    @let pinned = layout().state.pinned[columnKey()] !== undefined;
    <div
      data-adapttable-part="column-menu-item"
      [attr.data-actions]="side() === 'end' ? '' : null"
      [attr.data-reorder]="side() === 'start' ? '' : null"
      [attr.data-hidden]="hidden ? '' : null"
      [attr.data-pinned]="pinned ? side() : null"
    >
      <button
        class="btn btn-outline-secondary btn-sm"
        type="button"
        data-ngx-bootstrap-part="column-menu-visibility"
        [attr.data-active]="hidden ? null : ''"
        [attr.aria-pressed]="!hidden"
        [attr.aria-label]="(hidden ? showLabel() : hideLabel()) + ': ' + name()"
        (click)="layout().toggleVisible(columnKey())"
      >
        <svg [adaptIcon]="hidden ? eyeOff : eyeOn"></svg>
      </button>
      <span
        data-ngx-bootstrap-part="column-menu-label"
        [attr.data-hidden]="hidden ? '' : null"
        >{{ name() }}</span
      >
      <button
        class="btn btn-sm"
        [class.btn-primary]="pinned"
        [class.btn-outline-secondary]="!pinned"
        type="button"
        data-ngx-bootstrap-part="column-menu-pin"
        [attr.data-active]="pinned ? '' : null"
        [attr.aria-pressed]="pinned"
        [attr.aria-label]="(pinned ? unpinLabel() : pinLabel()) + ': ' + name()"
        (click)="layout().setPinned(columnKey(), pinned ? undefined : side())"
      >
        <svg [adaptIcon]="pinIcon"></svg>
      </button>
    </div>
  `,
})
export class AdaptColumnMenuEdgeRow extends AdaptColumnMenuEdgeRowModel {}

/**
 * The Columns menu in the toolbar.
 *
 * @public
 */
@Component({
  selector: "adapt-column-menu",
  imports: [
    AdaptColumnMenuRow,
    AdaptColumnMenuEdgeRow,
    BsDropdownDirective,
    BsDropdownMenuDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <div
      #root
      #menu="bs-dropdown"
      dropdown
      [dropup]="preferredAbove()"
      [isOpen]="menuOpen()"
      [isAnimated]="false"
      [container]="overlayContainer()"
      [autoClose]="true"
      [insideClick]="true"
      (isOpenChange)="menuOpen.set($event)"
      data-ngx-bootstrap-part="column-menu"
      style="position: relative"
    >
      <button
        class="btn btn-outline-secondary btn-sm"
        #trigger
        (pointerdown)="prepare()"
        (keydown)="prepare()"
        (click)="toggleMenu()"
        type="button"
        data-adapttable-part="column-menu-button"
        aria-haspopup="true"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
      >
        {{ p.labels.columns }}
      </button>
      <div
        class="dropdown-menu"
        *dropdownMenu
        [style.max-height]="panelStyle()['max-height']"
        [style.overflow-y]="panelStyle()['overflow-y']"
        [style.box-sizing]="panelStyle()['box-sizing']"
        (keydown.escape)="
          $event.preventDefault();
          $event.stopPropagation();
          menu.hide();
          trigger.focus()
        "
      >
        @if (popover.open()) {
          <fieldset
            #panel
            data-ngx-bootstrap-part="column-menu-panel"
            [attr.aria-label]="p.labels.columns"
            [attr.dir]="p.dir ?? null"
            [style.border]="panelStyle().border"
            [style.padding]="panelStyle().padding"
          >
            <div data-ngx-bootstrap-part="column-menu-header">
              <span data-ngx-bootstrap-part="column-menu-title">{{
                p.labels.columns
              }}</span>
            </div>
            <input
              class="form-control form-control-sm"
              type="search"
              data-adapttable-part="column-menu-search"
              [attr.placeholder]="p.labels.searchColumns"
              [attr.aria-label]="p.labels.searchColumns"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
            <div data-adapttable-part="column-menu-bulk">
              <button
                class="btn btn-outline-secondary btn-sm"
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                (click)="showAll()"
              >
                {{ p.labels.showAllColumns }}
              </button>
              <button
                class="btn btn-outline-secondary btn-sm"
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                (click)="hideAll()"
              >
                {{ p.labels.hideAllColumns }}
              </button>
              <button
                class="btn btn-outline-secondary btn-sm"
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                (click)="unpinAll()"
              >
                {{ p.labels.unpinAllColumns }}
              </button>
            </div>
            @for (row of rows(); track row.key) {
              <adapt-column-menu-row [row]="row" [props]="p" [drag]="drag" />
            }
            @if (p.hasRowReorder || p.hasRowActions) {
              <hr data-ngx-bootstrap-part="column-menu-separator" />
            }
            @if (p.hasRowReorder) {
              <adapt-column-menu-edge-row
                [layout]="p.layout"
                [columnKey]="reorderKey"
                side="start"
                [name]="p.labels.reorderRow"
                [showLabel]="p.labels.showColumn"
                [hideLabel]="p.labels.hideColumn"
                [pinLabel]="p.labels.pinStart"
                [unpinLabel]="p.labels.unpin"
              />
            }
            @if (p.hasRowActions) {
              <adapt-column-menu-edge-row
                [layout]="p.layout"
                [columnKey]="actionsKey"
                side="end"
                [name]="p.labels.actions"
                [showLabel]="p.labels.showColumn"
                [hideLabel]="p.labels.hideColumn"
                [pinLabel]="p.labels.pinEnd"
                [unpinLabel]="p.labels.unpin"
              />
            }
            <button
              class="btn btn-outline-secondary btn-sm"
              type="button"
              data-ngx-bootstrap-part="column-menu-auto-size"
              (click)="p.onAutoSize()"
            >
              {{ p.labels.autoSizeColumns }}
            </button>
            <button
              class="btn btn-outline-secondary btn-sm"
              type="button"
              data-ngx-bootstrap-part="column-menu-reset"
              (click)="p.layout.reset()"
            >
              {{ p.labels.resetColumns }}
            </button>
          </fieldset>
        }
      </div>
    </div>
  `,
})
export class AdaptColumnMenu extends AdaptColumnMenuModel {
  protected readonly overlayContainer = injectBootstrapOverlayContainer();

  protected readonly menuOpen = signal(false);
  private readonly opener = viewChild<ElementRef<HTMLElement>>("trigger");
  private readonly room = injectPopoverSpace({
    origin: () => this.opener()?.nativeElement,
    open: () => this.menuOpen(),
    reserve: 16,
    allowAbove: () => {
      const anchor = this.opener()?.nativeElement;
      const view = anchor?.ownerDocument.defaultView;
      return (
        !!anchor &&
        !!view &&
        view.innerHeight - anchor.getBoundingClientRect().bottom < 240
      );
    },
  });
  protected readonly preferredAbove = signal(false);
  private readonly preparedHeight = signal(360);
  private readonly injector = inject(Injector);
  private pendingOpen: AfterRenderRef | undefined;
  protected toggleMenu(): void {
    this.prepare();
    if (this.dropdown()?.isOpen) {
      this.closeMenu();
      return;
    }
    if (this.pendingOpen) {
      this.closeMenu();
      return;
    }
    // Render dropup and height inputs before the SDK measures its popup.
    // Opening still calls the SDK directly, so a close/open input pair
    // coalescing into one render cannot leave the native dropdown closed.
    this.pendingOpen = afterNextRender(
      () => {
        this.pendingOpen = undefined;
        this.dropdown()?.show();
      },
      { injector: this.injector }
    );
  }
  private closeMenu(): void {
    this.pendingOpen?.destroy();
    this.pendingOpen = undefined;
    this.dropdown()?.hide();
  }
  protected prepare(): void {
    const anchor = this.opener()?.nativeElement;
    const view = anchor?.ownerDocument.defaultView;
    if (!anchor || !view) return;
    const bounds = anchor.getBoundingClientRect();
    const below = Math.max(0, view.innerHeight - bounds.bottom - 16);
    const above = Math.max(0, bounds.top - 16);
    const up = below < 240 && above > below;
    this.preferredAbove.set(up);
    this.preparedHeight.set(Math.min(560, up ? above : below));
  }
  protected readonly panelStyle = computed(() => ({
    "max-height": `${Math.min(this.preparedHeight(), this.room())}px`,
    "overflow-y": "auto",
    "box-sizing": "border-box",
    border: "0",
    padding: "0.75rem",
  }));

  constructor() {
    super();
    afterRenderEffect((cleanup) => {
      if (!this.menuOpen()) return;
      const document = this.opener()?.nativeElement.ownerDocument;
      if (!document) return;
      const keydown = (event: KeyboardEvent) => {
        if (
          event.key !== "Escape" ||
          event.defaultPrevented ||
          event.isComposing
        )
          return;
        this.closeMenu();
        this.opener()?.nativeElement.focus();
      };
      const outside = (event: MouseEvent) => {
        const target = event.target;
        if (
          target instanceof Node &&
          (this.opener()?.nativeElement.contains(target) ||
            this.panel()?.nativeElement?.contains(target))
        )
          return;
        this.closeMenu();
      };
      document.addEventListener("click", outside);
      cleanup(() => document.removeEventListener("click", outside));
      document.addEventListener("keydown", keydown);
      cleanup(() => document.removeEventListener("keydown", keydown));
    });
  }
  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");
  private readonly dropdown = viewChild(BsDropdownDirective);

  protected readonly popover = {
    open: this.menuOpen.asReadonly(),
    toggle: (): void => this.toggleMenu(),
    close: (): void => this.closeMenu(),
  };
}
