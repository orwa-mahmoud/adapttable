/**
 * The compact header-filter row, drawn with native controls.
 */
import {
  AdaptFilterHeaderChrome,
  AdaptFilterHeaderControlChrome,
  type FilterDef,
  type FilterFormSource,
  type FilterHeaderClassNames,
  type FilterHeaderMultiProps,
  type FilterHeaderRangeProps,
  type FilterHeaderSearchProps,
  type FilterHeaderSelectProps,
  type FilterHeaderSlots,
  type FilterTypeRegistry,
  type TableLabels,
} from "@adapttable/angular";
import { AdaptCdkPopover } from "@adapttable/angular-cdk";
import { A11yModule } from "@angular/cdk/a11y";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** A text search in a header cell. */
@Component({
  imports: [A11yModule],
  selector: "adapt-header-filter-search",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      cdkMonitorElementFocus
      data-adapttable-cdk-control
      type="search"
      data-adapttable-part="filter-header-input"
      [attr.aria-label]="props().label"
      [attr.placeholder]="props().placeholder"
      [value]="props().value"
      [class]="props().className"
      (input)="props().onChange($any($event.target).value)"
    />
  `,
})
class AdaptHeaderFilterSearch {
  /** The search box's props. */
  readonly props = input.required<FilterHeaderSearchProps>();
}

/** A single-choice select in a header cell. */
@Component({
  imports: [A11yModule],
  selector: "adapt-header-filter-select",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select
      cdkMonitorElementFocus
      data-adapttable-cdk-control
      data-adapttable-part="filter-header-input"
      [attr.aria-label]="props().label"
      [value]="props().value"
      [class]="props().className"
      (change)="props().onChange($any($event.target).value)"
    >
      @for (option of props().options; track option.value) {
        <option
          [value]="option.value"
          [selected]="option.value === props().value"
        >
          {{ option.label }}
        </option>
      }
    </select>
  `,
})
class AdaptHeaderFilterSelect {
  /** The select's props. */
  readonly props = input.required<FilterHeaderSelectProps>();
}

/** One bound of a number or date range. */
@Component({
  imports: [A11yModule],
  selector: "adapt-header-filter-range",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      cdkMonitorElementFocus
      data-adapttable-cdk-control
      [attr.type]="props().type"
      [attr.aria-label]="props().label"
      [value]="props().value"
      (input)="props().onChange($any($event.target).value)"
    />
  `,
})
class AdaptHeaderFilterRange {
  /** The bound's props. */
  readonly props = input.required<FilterHeaderRangeProps>();
}

/** A compact multi-select menu in a header cell. */
@Component({
  imports: [AdaptCdkPopover, A11yModule],
  selector: "adapt-header-filter-multi",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <adapt-cdk-popover [trigger]="trigger" [content]="content" />
    <ng-template #trigger let-toggle let-open="open">
      <button
        cdkMonitorElementFocus
        data-adapttable-cdk-control
        type="button"
        [attr.aria-expanded]="open"
        (click)="toggle()"
        data-adapttable-part="filter-header-input"
        [attr.aria-label]="props().label"
        [class]="props().className"
        style="cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 8px; box-sizing: border-box; width: 100%; padding: 4px 8px; border: 1px solid currentColor; border-radius: 6px; background: Canvas; overflow: hidden; list-style: none"
      >
        <span
          style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
          >{{ props().summary }}</span
        >
        <span aria-hidden="true">▾</span>
      </button>
    </ng-template>
    <ng-template #content>
      <fieldset
        data-adapttable-part="filter-header-menu"
        [attr.aria-label]="props().label"
        [class]="props().menuClassName"
        style="min-width: 100%; max-height: 220px; overflow: auto; margin: 0; padding: 8px; display: flex; flex-direction: column; gap: 6px; background: Canvas; color: CanvasText; border: 1px solid currentColor; border-radius: 6px"
      >
        @for (option of props().options; track option.value) {
          <label style="display: flex; gap: 8px; align-items: center">
            <input
              cdkMonitorElementFocus
              data-adapttable-cdk-control
              type="checkbox"
              [checked]="props().selected.includes(option.value)"
              (change)="
                props().onToggle(option.value, $any($event.target).checked)
              "
            />
            {{ option.label }}
          </label>
        }
      </fieldset>
    </ng-template>
  `,
})
class AdaptHeaderFilterMulti {
  /** The menu's props. */
  readonly props = input.required<FilterHeaderMultiProps>();
}

const SLOTS: FilterHeaderSlots = {
  Search: AdaptHeaderFilterSearch,
  Select: AdaptHeaderFilterSelect,
  Range: AdaptHeaderFilterRange,
  Multi: AdaptHeaderFilterMulti,
};

/**
 * One compact header filter, drawn with this kit's native controls.
 *
 * @public
 */
@Component({
  selector: "adapt-filter-header-control",
  imports: [AdaptFilterHeaderControlChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <adapt-filter-header-control-chrome
      [def]="def()"
      [source]="source()"
      [labels]="labels()"
      [className]="className()"
      [registry]="registry()"
      [slots]="slots"
    />
  `,
})
export class AdaptFilterHeaderControl<TRow> {
  /** The filter this control edits. */
  readonly def = input.required<FilterDef<TRow>>();
  /** Reads and writes the active filter values. */
  readonly source = input.required<FilterFormSource<TRow>>();
  /** Resolved labels, every key filled. */
  readonly labels = input.required<Required<TableLabels>>();
  /** Class for the control. */
  readonly className = input<string>();
  /** Custom filter types, beyond the built-ins. */
  readonly registry = input<FilterTypeRegistry>();

  /** This kit's native controls. */
  protected readonly slots = SLOTS;
}

/**
 * The filter row under the column headers, drawn with this kit's controls.
 *
 * @public
 */
@Component({
  selector: "adapt-filter-header-row",
  imports: [AdaptFilterHeaderChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <adapt-filter-header-chrome
      [enabled]="enabled()"
      [columns]="columns()"
      [defs]="defs()"
      [source]="source()"
      [labels]="labels()"
      [registry]="registry()"
      [expandable]="expandable()"
      [showReorder]="showReorder()"
      [selection]="selection()"
      [showActions]="showActions()"
      [columnSpacers]="columnSpacers()"
      [cellStyle]="cellStyle()"
      [pinSide]="pinSide()"
      [padStyle]="padStyle()"
      [stickyAttr]="stickyAttr()"
      [classNames]="classNames()"
      [slots]="slots"
    />
  `,
})
export class AdaptFilterHeaderRow<TRow> {
  /** When false the row does not render, even if definitions exist. */
  readonly enabled = input(true);
  /** Visible columns, so each filter lands under its own header. */
  readonly columns = input.required<readonly { readonly key: string }[]>();
  /** Filter definitions to render. */
  readonly defs = input.required<readonly FilterDef<TRow>[]>();
  /** Reads and writes the active filter values. */
  readonly source = input.required<FilterFormSource<TRow>>();
  /** Resolved labels, every key filled. */
  readonly labels = input.required<Required<TableLabels>>();
  /** Custom filter types, beyond the built-ins. */
  readonly registry = input<FilterTypeRegistry>();
  /** Whether an expansion column is injected. */
  readonly expandable = input(false);
  /** Whether a reorder column is injected. */
  readonly showReorder = input(false);
  /** Whether a selection column is injected. */
  readonly selection = input(false);
  /** Whether an actions column is injected. */
  readonly showActions = input(false);
  /** Widths standing in for columns outside the window. */
  readonly columnSpacers = input<{
    readonly start: number;
    readonly end: number;
  }>();
  /** Width and sticky offsets for a column's filter cell. */
  readonly cellStyle =
    input<
      (column: {
        readonly key: string;
      }) => Readonly<Record<string, string>> | undefined
    >();
  /** Edge a column is pinned to, absent when it floats. */
  readonly pinSide = input<(key: string) => "start" | "end" | undefined>();
  /** Style for the spacer cells at either end. */
  readonly padStyle = input<Readonly<Record<string, string>>>();
  /** Present only when the row sticks, for styling hooks. */
  readonly stickyAttr = input<true>();
  /** Per-part classes for the row. */
  readonly classNames = input<FilterHeaderClassNames>();

  /** This kit's native controls. */
  protected readonly slots = SLOTS;
}
