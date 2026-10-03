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
  type ElementRef,
  inject,
  Injector,
  viewChild,
} from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";
import { MENU_PANEL_STYLE, menuPopover } from "./menuPopover";

/**
 * The Columns menu: a disclosure button and a panel where each column has a
 * reorder grip, an eye toggle, a pin toggle and a submenu of actions — drawn
 * with native controls, over the menu model in `@adapttable/angular`.
 */

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
  imports: [...TAIGA_CONTROLS, AdaptAttrs, AdaptIcon, AdaptLiveRegion],
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
        data-taiga-part="column-menu-grip"
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
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        data-taiga-part="column-menu-visibility"
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
        data-taiga-part="column-menu-label"
        [attr.data-hidden]="r.hidden ? '' : null"
        >{{ r.name }}</span
      >
      <button
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        data-taiga-part="column-menu-pin"
        [attr.data-active]="r.pinned !== undefined ? '' : null"
        [attr.aria-pressed]="r.pinned !== undefined"
        [attr.aria-label]="pinLabel(r, p) + ': ' + r.name"
        [disabled]="!r.canPin"
        (click)="p.layout.setPinned(r.key, nextPin(r))"
      >
        <svg [adaptIcon]="pinIcon"></svg>
      </button>
      <button
        tuiButton
        size="s"
        appearance="secondary"
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
                <span data-taiga-part="column-menu-choice-label">{{
                  choice.label
                }}</span>
                <tui-textfield
                  [tuiTextfieldCleaner]="false"
                  [stringify]="choice.options | taigaLabels"
                  ><input
                    tuiSelect
                    data-taiga-part="column-menu-choice-select"
                    [attr.aria-label]="choice.label"
                    [ngModel]="choice.value"
                    [disabled]="choice.disabled"
                    (ngModelChange)="choice.onChange($event)"
                  /><tui-data-list *tuiDropdown>
                    @for (option of choice.options; track option.value) {
                      <button tuiOption type="button" [value]="option.value">
                        {{ option.label }}
                      </button>
                    }
                  </tui-data-list></tui-textfield
                >
              </label>
            } @else {
              <button
                tuiButton
                size="s"
                appearance="secondary"
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
              <tui-textfield
                ><input
                  tuiInput
                  data-adapttable-part="column-rename-input"
                  [adaptAttrs]="rename.inputAttrs()"
              /></tui-textfield>
              @if (rename.error(); as error) {
                <span
                  data-adapttable-part="column-rename-error"
                  role="alert"
                  [attr.id]="rename.errorId"
                  >{{ error }}</span
                >
              }
              <button
                tuiButton
                size="s"
                appearance="secondary"
                type="submit"
                data-adapttable-part="column-rename-save"
              >
                {{ p.labels.saveColumnName }}
              </button>
              <button
                tuiButton
                size="s"
                appearance="secondary"
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
  imports: [...TAIGA_CONTROLS, AdaptIcon],
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
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        data-taiga-part="column-menu-visibility"
        [attr.data-active]="hidden ? null : ''"
        [attr.aria-pressed]="!hidden"
        [attr.aria-label]="(hidden ? showLabel() : hideLabel()) + ': ' + name()"
        (click)="layout().toggleVisible(columnKey())"
      >
        <svg [adaptIcon]="hidden ? eyeOff : eyeOn"></svg>
      </button>
      <span
        data-taiga-part="column-menu-label"
        [attr.data-hidden]="hidden ? '' : null"
        >{{ name() }}</span
      >
      <button
        tuiButton
        size="s"
        appearance="secondary"
        type="button"
        data-taiga-part="column-menu-pin"
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
  imports: [...TAIGA_CONTROLS, AdaptColumnMenuRow, AdaptColumnMenuEdgeRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <div
      [tuiDropdown]="menuContent"
      tuiDropdownRole="dialog"
      [adaptTaigaDropdownLabel]="p.labels.columns"
      [tuiDropdownOpen]="popover.open()"
      (tuiDropdownOpenChange)="popover.setOpen($event)"
      #root
      data-taiga-part="column-menu"
      style="position: relative"
    >
      <button
        tuiButton
        size="s"
        appearance="secondary"
        #trigger
        #tuiDropdownHost
        type="button"
        data-adapttable-part="column-menu-button"
        aria-haspopup="true"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
      >
        {{ p.labels.columns }}
      </button>
      <ng-template #menuContent>
        @if (popover.open()) {
          <fieldset
            #panel
            data-taiga-part="column-menu-panel"
            [attr.aria-label]="p.labels.columns"
            [attr.dir]="p.dir ?? null"
            [style]="panelStyle"
          >
            <div data-taiga-part="column-menu-header">
              <span data-taiga-part="column-menu-title">{{
                p.labels.columns
              }}</span>
            </div>
            <tui-textfield
              ><input
                tuiInput
                type="search"
                data-adapttable-part="column-menu-search"
                [attr.placeholder]="p.labels.searchColumns"
                [attr.aria-label]="p.labels.searchColumns"
                [value]="query()"
                (input)="query.set($any($event.target).value)"
            /></tui-textfield>
            <div data-adapttable-part="column-menu-bulk">
              <button
                tuiButton
                size="s"
                appearance="secondary"
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                (click)="showAll()"
              >
                {{ p.labels.showAllColumns }}
              </button>
              <button
                tuiButton
                size="s"
                appearance="secondary"
                type="button"
                data-adapttable-part="column-menu-bulk-button"
                (click)="hideAll()"
              >
                {{ p.labels.hideAllColumns }}
              </button>
              <button
                tuiButton
                size="s"
                appearance="secondary"
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
              <hr data-taiga-part="column-menu-separator" />
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
              tuiButton
              size="s"
              appearance="secondary"
              type="button"
              data-taiga-part="column-menu-auto-size"
              (click)="p.onAutoSize()"
            >
              {{ p.labels.autoSizeColumns }}
            </button>
            <button
              tuiButton
              size="s"
              appearance="secondary"
              type="button"
              data-taiga-part="column-menu-reset"
              (click)="p.layout.reset()"
            >
              {{ p.labels.resetColumns }}
            </button>
          </fieldset>
        }
      </ng-template>
    </div>
  `,
})
export class AdaptColumnMenu extends AdaptColumnMenuModel {
  protected readonly panelStyle = MENU_PANEL_STYLE;

  private readonly root = viewChild<ElementRef<HTMLElement>>("root");

  private readonly trigger = viewChild<ElementRef<HTMLElement>>("trigger");

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
