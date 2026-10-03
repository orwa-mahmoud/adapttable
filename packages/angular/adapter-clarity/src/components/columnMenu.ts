/**
 * The Columns menu: a disclosure button and a panel where each column has a
 * reorder grip, an eye toggle, a pin toggle and a submenu of actions — drawn
 * with native controls, over the menu model in `@adapttable/angular`.
 */
import {
  ACTIONS_COLUMN_KEY,
  AdaptAttrs,
  AdaptIcon,
  AdaptLiveRegion,
  ADAPTTABLE_SLOT_TABLE,
  type ColumnDrag,
  type ColumnLayout,
  columnMenuActions,
  type ColumnMenuChoice,
  type ColumnMenuItem,
  type ColumnMenuRow,
  columnMenuRows,
  type ColumnMenuSlotProps,
  eyeIcon,
  filterColumnMenuRows,
  GRIP_ICON,
  hideAllColumns,
  injectColumnDrag,
  injectColumnRenameEditor,
  nextPinSide,
  PIN_ICON,
  pinActionLabel,
  REORDER_COLUMN_KEY,
  showAllColumns,
  unpinAllColumns,
} from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  Injector,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { ClrInputModule, ClrSelectModule } from "@clr/angular";

import { MENU_PANEL_STYLE, menuPopover } from "./menuPopover";

/** The menu's props, with the row type erased as every slot erases it. */

const NOOP_RENAME = (): void => undefined;

/** Whether a submenu item is a choice rather than a plain action. */
function isChoice(item: ColumnMenuItem): item is ColumnMenuChoice {
  return "kind" in item && item.kind === "choice";
}

/**
 * One column's row: grip, eye, name, pin, and the "more" submenu with the
 * rename editor.
 *
 * @internal
 */
@Component({
  selector: "adapt-column-menu-row",
  imports: [
    ClrInputModule,
    ClrSelectModule,
    AdaptAttrs,
    AdaptIcon,
    AdaptLiveRegion,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapttable-clarity", style: "display: contents" },
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
        data-clarity-part="column-menu-grip"
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
        class="btn btn-sm btn-outline"
        type="button"
        data-clarity-part="column-menu-visibility"
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
        data-clarity-part="column-menu-label"
        [attr.data-hidden]="r.hidden ? '' : null"
        >{{ r.name }}</span
      >
      <button
        class="btn btn-sm btn-outline"
        type="button"
        data-clarity-part="column-menu-pin"
        [attr.data-active]="r.pinned !== undefined ? '' : null"
        [attr.aria-pressed]="r.pinned !== undefined"
        [attr.aria-label]="pinLabel(r, p) + ': ' + r.name"
        [disabled]="!r.canPin"
        (click)="p.layout.setPinned(r.key, nextPin(r))"
      >
        <svg [adaptIcon]="pinIcon"></svg>
      </button>
      <button
        class="btn btn-sm btn-outline"
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
                <span data-clarity-part="column-menu-choice-label">{{
                  choice.label
                }}</span>
                <select
                  clrSelect
                  data-clarity-part="column-menu-choice-select"
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
                class="btn btn-sm btn-outline"
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
                clrInput
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
                class="btn btn-sm btn-outline"
                type="submit"
                data-adapttable-part="column-rename-save"
              >
                {{ p.labels.saveColumnName }}
              </button>
              <button
                class="btn btn-sm btn-outline"
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
export class AdaptColumnMenuRow {
  /** The row. */
  readonly row = input.required<ColumnMenuRow<never>>();
  /** The menu's props. */
  readonly props = input.required<ColumnMenuSlotProps<never>>();
  /** The menu's drag state. */
  readonly drag = input.required<ColumnDrag>();

  protected readonly open = signal(false);
  protected readonly gripIcon = GRIP_ICON;
  protected readonly pinIcon = PIN_ICON;
  protected readonly eyeOn = eyeIcon(false);
  protected readonly eyeOff = eyeIcon(true);
  private readonly table = inject(ADAPTTABLE_SLOT_TABLE);

  protected readonly rename = injectColumnRenameEditor({
    column: computed(() => ({
      key: this.row().key,
      name: this.row().name,
      onRename: this.props().onRenameColumn ?? NOOP_RENAME,
      requiredMessage: this.props().labels.columnNameRequired,
      renamedMessage: this.props().labels.columnRenamed,
    })),
  });

  protected readonly actions = computed(() => {
    const props = this.props();
    return columnMenuActions(this.row(), {
      featureHost: this.table.featureHost as never,
      labels: props.labels,
      layout: props.layout,
      sortBy: props.sortBy,
      sortDir: props.sortDir,
      onSortColumn: props.onSortColumn,
      onAutoSizeColumn: props.onAutoSizeColumn,
      onFilterColumn: props.onFilterColumn,
      onBeginRename: props.onRenameColumn ? this.rename.begin : undefined,
      groupingPanel: props.groupingPanel,
    });
  });

  protected pinLabel(
    row: ColumnMenuRow<never>,
    props: ColumnMenuSlotProps<never>
  ): string {
    return pinActionLabel(row.pinned, props.labels);
  }

  protected nextPin(row: ColumnMenuRow<never>): ReturnType<typeof nextPinSide> {
    return nextPinSide(row.pinned);
  }

  protected asChoice(item: ColumnMenuItem): ColumnMenuChoice | undefined {
    return isChoice(item) ? item : undefined;
  }

  protected asAction(item: ColumnMenuItem): { disabled: boolean } {
    return item;
  }

  protected runAction(item: ColumnMenuItem): void {
    if (isChoice(item)) return;
    item.run();
    if (item.id !== "rename") this.open.set(false);
  }
}

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
  host: { class: "adapttable-clarity", style: "display: contents" },
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
        class="btn btn-sm btn-outline"
        type="button"
        data-clarity-part="column-menu-visibility"
        [attr.data-active]="hidden ? null : ''"
        [attr.aria-pressed]="!hidden"
        [attr.aria-label]="(hidden ? showLabel() : hideLabel()) + ': ' + name()"
        (click)="layout().toggleVisible(columnKey())"
      >
        <svg [adaptIcon]="hidden ? eyeOff : eyeOn"></svg>
      </button>
      <span
        data-clarity-part="column-menu-label"
        [attr.data-hidden]="hidden ? '' : null"
        >{{ name() }}</span
      >
      <button
        class="btn btn-sm btn-outline"
        type="button"
        data-clarity-part="column-menu-pin"
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
export class AdaptColumnMenuEdgeRow {
  /** The column layout. */
  readonly layout = input.required<ColumnLayout<never>>();
  /** The reserved column's key. */
  readonly columnKey = input.required<string>();
  /** The edge it pins to. */
  readonly side = input.required<"start" | "end">();
  /** Its name. */
  readonly name = input.required<string>();
  /** "Show column". */
  readonly showLabel = input.required<string>();
  /** "Hide column". */
  readonly hideLabel = input.required<string>();
  /** "Pin to start" or "Pin to end". */
  readonly pinLabel = input.required<string>();
  /** "Unpin". */
  readonly unpinLabel = input.required<string>();

  protected readonly pinIcon = PIN_ICON;
  protected readonly eyeOn = eyeIcon(false);
  protected readonly eyeOff = eyeIcon(true);
}

/**
 * The Columns menu in the toolbar.
 *
 * @public
 */
@Component({
  host: { class: "adapttable-clarity" },
  selector: "adapt-column-menu",
  imports: [ClrInputModule, AdaptColumnMenuRow, AdaptColumnMenuEdgeRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = props();
    <div #root data-clarity-part="column-menu" style="position: relative">
      <button
        class="btn btn-sm btn-outline"
        #trigger
        type="button"
        data-adapttable-part="column-menu-button"
        aria-haspopup="true"
        style="flex-shrink: 0; white-space: nowrap"
        [attr.aria-expanded]="popover.open()"
        [attr.data-active]="popover.open() ? '' : null"
        (click)="popover.toggle()"
      >
        {{ p.labels.columns }}
      </button>
      @if (popover.open()) {
        <fieldset
          #panel
          class="dropdown-menu"
          data-clarity-part="column-menu-panel"
          [attr.aria-label]="p.labels.columns"
          [attr.dir]="p.dir ?? null"
          [style]="panelStyle"
        >
          <div data-clarity-part="column-menu-header">
            <span data-clarity-part="column-menu-title">{{
              p.labels.columns
            }}</span>
          </div>
          <input
            clrInput
            type="search"
            data-adapttable-part="column-menu-search"
            [attr.placeholder]="p.labels.searchColumns"
            [attr.aria-label]="p.labels.searchColumns"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
          <div data-adapttable-part="column-menu-bulk">
            <button
              class="btn btn-sm btn-outline"
              type="button"
              data-adapttable-part="column-menu-bulk-button"
              (click)="showAll()"
            >
              {{ p.labels.showAllColumns }}
            </button>
            <button
              class="btn btn-sm btn-outline"
              type="button"
              data-adapttable-part="column-menu-bulk-button"
              (click)="hideAll()"
            >
              {{ p.labels.hideAllColumns }}
            </button>
            <button
              class="btn btn-sm btn-outline"
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
            <hr data-clarity-part="column-menu-separator" />
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
            class="btn btn-sm btn-outline"
            type="button"
            data-clarity-part="column-menu-auto-size"
            (click)="p.onAutoSize()"
          >
            {{ p.labels.autoSizeColumns }}
          </button>
          <button
            class="btn btn-sm btn-outline"
            type="button"
            data-clarity-part="column-menu-reset"
            (click)="p.layout.reset()"
          >
            {{ p.labels.resetColumns }}
          </button>
        </fieldset>
      }
    </div>
  `,
})
export class AdaptColumnMenu {
  /** The slot's props. */
  readonly props = input.required<ColumnMenuSlotProps<never>>();

  protected readonly query = signal("");
  protected readonly panelStyle = MENU_PANEL_STYLE;
  protected readonly reorderKey = REORDER_COLUMN_KEY;
  protected readonly actionsKey = ACTIONS_COLUMN_KEY;
  protected readonly drag = injectColumnDrag();
  protected readonly rows = computed(() =>
    filterColumnMenuRows(
      columnMenuRows(this.props().allColumns, this.props().layout),
      this.query()
    )
  );

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

  protected showAll(): void {
    showAllColumns(this.rows(), this.props().layout);
  }

  protected hideAll(): void {
    hideAllColumns(this.rows(), this.props().layout);
  }

  protected unpinAll(): void {
    unpinAllColumns(this.rows(), this.props().layout);
  }
}
