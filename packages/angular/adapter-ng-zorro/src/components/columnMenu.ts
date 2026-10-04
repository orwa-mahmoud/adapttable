/**
 * The Columns menu: a disclosure button and a panel where each column has a
 * reorder grip, an eye toggle, a pin toggle and a submenu of actions — drawn
 * with NG-ZORRO controls, over the menu model in `@adapttable/angular`.
 */
import {
  AdaptAttrs,
  AdaptColumnMenuEdgeRowModel,
  AdaptColumnMenuModel,
  AdaptColumnMenuRowModel,
  AdaptIcon,
  AdaptLiveRegion,
} from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCardModule } from "ng-zorro-antd/card";
import { NzDividerModule } from "ng-zorro-antd/divider";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzPopoverModule } from "ng-zorro-antd/popover";
import { NzSelectModule } from "ng-zorro-antd/select";

import { MENU_PANEL_STYLE, menuPopover } from "./menuPopover";
import { AdaptOverlayOrigin, OVERLAY_Z } from "./overlayPlacement";

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
  imports: [
    AdaptAttrs,
    AdaptIcon,
    AdaptLiveRegion,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzInputModule,
    NzSelectModule,
    AdaptOverlayOrigin,
  ],
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
      <button
        nz-button
        type="button"
        [disabled]="!r.canMove"
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
      >
        <svg [adaptIcon]="gripIcon"></svg>
      </button>
      <button
        nz-button
        type="button"
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
      <span [attr.data-hidden]="r.hidden ? '' : null">{{ r.name }}</span>
      <button
        nz-button
        type="button"
        [attr.data-active]="r.pinned !== undefined ? '' : null"
        [attr.aria-pressed]="r.pinned !== undefined"
        [attr.aria-label]="pinLabel(r, p) + ': ' + r.name"
        [disabled]="!r.canPin"
        (click)="p.layout.setPinned(r.key, nextPin(r))"
      >
        <svg [adaptIcon]="pinIcon"></svg>
      </button>
      <button
        nz-button
        type="button"
        data-adapttable-part="column-menu-more"
        [attr.aria-expanded]="open()"
        [attr.aria-label]="p.labels.columnActions + ': ' + r.name"
        (click)="open.set(!open())"
      >
        <span>⋯ </span>
      </button>
      @if (open()) {
        <nz-card nzSize="small" data-adapttable-part="column-menu-submenu">
          @for (item of actions(); track item.id) {
            @if (asChoice(item); as choice) {
              <label data-adapttable-part="column-menu-choice">
                <span>{{ choice.label }}</span>
                <nz-select
                  adaptOverlayOrigin
                  [attr.aria-label]="choice.label"
                  [ngModel]="choice.value"
                  [nzDisabled]="choice.disabled"
                  (ngModelChange)="choice.onChange($event)"
                >
                  @for (option of choice.options; track option.value) {
                    <nz-option
                      [nzValue]="option.value"
                      [nzLabel]="option.label"
                    />
                  }
                </nz-select>
              </label>
            } @else {
              <button
                nz-button
                type="button"
                data-adapttable-part="column-menu-action"
                [disabled]="
                  asAction(item).disabled ||
                  (item.id === 'rename' && rename.editing())
                "
                (click)="runAction(item)"
              >
                <span>{{ item.label }} </span>
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
                nz-input
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
                nz-button
                type="submit"
                data-adapttable-part="column-rename-save"
              >
                <span>{{ p.labels.saveColumnName }} </span>
              </button>
              <button
                nz-button
                type="button"
                data-adapttable-part="column-rename-cancel"
                (click)="rename.cancel()"
              >
                <span>{{ p.labels.cancelColumnRename }} </span>
              </button>
            </form>
          }
        </nz-card>
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
  imports: [AdaptIcon, NzButtonModule],
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
        nz-button
        type="button"
        [attr.data-active]="hidden ? null : ''"
        [attr.aria-pressed]="!hidden"
        [attr.aria-label]="(hidden ? showLabel() : hideLabel()) + ': ' + name()"
        (click)="layout().toggleVisible(columnKey())"
      >
        <svg [adaptIcon]="hidden ? eyeOff : eyeOn"></svg>
      </button>
      <span [attr.data-hidden]="hidden ? '' : null">{{ name() }}</span>
      <button
        nz-button
        type="button"
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
    NzButtonModule,
    NzCardModule,
    NzDividerModule,
    NzInputModule,
    NzPopoverModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <div #root [dir]="p.dir ?? 'ltr'">
      <button
        nz-button
        #trigger
        nz-popover
        [nzPopoverTrigger]="null"
        [nzPopoverVisible]="popover.open()"
        [nzPopoverBackdrop]="false"
        [nzPopoverContent]="content"
        [nzPopoverPlacement]="p.dir === 'rtl' ? 'bottomLeft' : 'bottomRight'"
        [nzPopoverOverlayStyle]="overlayStyle"
        type="button"
        data-adapttable-part="column-menu-button"
        aria-haspopup="true"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
        (click)="popover.toggle()"
      >
        <span>{{ p.labels.columns }} </span>
      </button>
      <ng-template #content>
        @if (popover.open()) {
          <fieldset
            #panel
            [attr.aria-label]="p.labels.columns"
            [dir]="p.dir ?? 'ltr'"
            [style]="panelStyle"
          >
            <div>
              <span>{{ p.labels.columns }}</span>
            </div>
            <input
              nz-input
              type="search"
              data-adapttable-part="column-menu-search"
              [attr.placeholder]="p.labels.searchColumns"
              [attr.aria-label]="p.labels.searchColumns"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
            <div data-adapttable-part="column-menu-bulk">
              <button
                nz-button
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                (click)="showAll()"
              >
                <span>{{ p.labels.showAllColumns }} </span>
              </button>
              <button
                nz-button
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                (click)="hideAll()"
              >
                <span>{{ p.labels.hideAllColumns }} </span>
              </button>
              <button
                nz-button
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                (click)="unpinAll()"
              >
                <span>{{ p.labels.unpinAllColumns }} </span>
              </button>
            </div>
            @for (row of rows(); track row.key) {
              <adapt-column-menu-row [row]="row" [props]="p" [drag]="drag" />
            }
            @if (p.hasRowReorder || p.hasRowActions) {
              <nz-divider />
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
            <button nz-button type="button" (click)="p.onAutoSize()">
              <span>{{ p.labels.autoSizeColumns }} </span>
            </button>
            <button nz-button type="button" (click)="p.layout.reset()">
              <span>{{ p.labels.resetColumns }} </span>
            </button>
          </fieldset>
        }
      </ng-template>
    </div>
  `,
})
export class AdaptColumnMenu extends AdaptColumnMenuModel {
  protected readonly panelStyle = MENU_PANEL_STYLE;

  protected readonly overlayStyle = { zIndex: String(OVERLAY_Z) };

  private readonly root = viewChild<ElementRef<HTMLElement>>("root");

  private readonly trigger = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("trigger", {
    read: ElementRef,
  });

  private readonly panel = viewChild<ElementRef<HTMLElement>>("panel");

  protected readonly popover = menuPopover(
    {
      root: () => this.root()?.nativeElement,
      trigger: () => this.trigger()?.nativeElement,
      panel: () => this.panel()?.nativeElement,
    },
    inject(Injector)
  );
}
