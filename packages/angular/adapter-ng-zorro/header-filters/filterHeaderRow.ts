/**
 * The compact header-filter row, drawn with NG-ZORRO controls.
 */
import type {
  FilterDef,
  FilterFormSource,
  FilterTypeRegistry,
  TableLabels,
} from "@adapttable/angular";
import {
  AdaptFilterHeaderChrome,
  AdaptFilterHeaderControlChrome,
  type FilterHeaderClassNames,
  type FilterHeaderMultiProps,
  type FilterHeaderRangeProps,
  type FilterHeaderSearchProps,
  type FilterHeaderSelectProps,
  type FilterHeaderSlots,
} from "@adapttable/angular/adapter";
import { AdaptOverlayOrigin, OVERLAY_Z } from "@adapttable/ng-zorro";
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  input,
  signal,
  viewChild,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzCheckboxModule } from "ng-zorro-antd/checkbox";
import { NzDropdownModule } from "ng-zorro-antd/dropdown";
import { NzInputModule } from "ng-zorro-antd/input";
import { NzSelectModule } from "ng-zorro-antd/select";

let nextHeaderId = 0;

function headerId(): string {
  nextHeaderId += 1;
  return `adapttable-header-select-${String(nextHeaderId)}`;
}

/** A text search in a header cell. */
@Component({
  selector: "adapt-header-filter-search",
  imports: [NzInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      nz-input
      nzSize="small"
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
  selector: "adapt-header-filter-select",
  imports: [AdaptOverlayOrigin, FormsModule, NzSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      [for]="id"
      style="position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap"
      >{{ props().label }}</label
    >
    <nz-select
      adaptOverlayOrigin
      nzSize="small"
      [nzId]="id"
      data-adapttable-part="filter-header-input"
      [ngModel]="props().value"
      [class]="props().className"
      style="width: 100%"
      (ngModelChange)="props().onChange($event)"
    >
      @for (option of props().options; track option.value) {
        <nz-option [nzValue]="option.value" [nzLabel]="option.label" />
      }
    </nz-select>
  `,
})
class AdaptHeaderFilterSelect {
  /** The select's props. */
  readonly props = input.required<FilterHeaderSelectProps>();
  protected readonly id = headerId();
}

/** One bound of a number or date range. */
@Component({
  selector: "adapt-header-filter-range",
  imports: [NzInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input
      nz-input
      nzSize="small"
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
  selector: "adapt-header-filter-multi",
  imports: [FormsModule, NzButtonModule, NzCheckboxModule, NzDropdownModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      #trigger
      nz-button
      nz-dropdown
      nzSize="small"
      type="button"
      nzTrigger="click"
      [nzDropdownMenu]="menu"
      [nzClickHide]="false"
      [nzBackdrop]="false"
      [nzVisible]="open()"
      [nzOverlayStyle]="overlayStyle"
      (nzVisibleChange)="open.set($event)"
      data-adapttable-part="filter-header-input"
      [attr.aria-label]="props().label"
      [attr.aria-expanded]="open()"
      aria-haspopup="dialog"
      [class]="props().className"
      style="width: 100%; overflow: hidden"
      (keydown.escape)="dismiss($event)"
    >
      <span>{{ props().summary }} </span><span aria-hidden="true">▾</span>
    </button>
    <nz-dropdown-menu #menu="nzDropdownMenu">
      <fieldset
        #choices
        role="dialog"
        data-adapttable-part="filter-header-menu"
        [attr.aria-label]="props().label"
        [class]="props().menuClassName"
        style="min-width: 10rem; max-height: 220px; overflow: auto; margin: 0; padding: 8px; display: flex; flex-direction: column; gap: 6px; background: var(--ant-color-bg-elevated, white); color: var(--ant-color-text, inherit); border: 0; box-shadow: 0 6px 16px rgb(0 0 0 / 12%)"
        (keydown.escape)="dismiss($event)"
      >
        @for (option of props().options; track option.value) {
          <label
            nz-checkbox
            [ngModel]="props().selected.includes(option.value)"
            (ngModelChange)="props().onToggle(option.value, $event)"
            >{{ option.label }}</label
          >
        }
      </fieldset>
    </nz-dropdown-menu>
  `,
})
class AdaptHeaderFilterMulti {
  /** The menu's props. */
  readonly props = input.required<FilterHeaderMultiProps>();
  protected readonly open = signal(false);
  protected readonly overlayStyle = { zIndex: OVERLAY_Z };
  private readonly trigger = viewChild.required<
    ElementRef<HTMLButtonElement>,
    ElementRef<HTMLButtonElement>
  >("trigger", { read: ElementRef });
  private readonly choices = viewChild<ElementRef<HTMLElement>>("choices");

  constructor() {
    effect(() => {
      if (this.open())
        this.choices()
          ?.nativeElement.querySelector<HTMLInputElement>("input")
          ?.focus();
    });
  }

  protected dismiss(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.open.set(false);
    this.trigger().nativeElement.focus();
  }
}

const SLOTS: FilterHeaderSlots = {
  Search: AdaptHeaderFilterSearch,
  Select: AdaptHeaderFilterSelect,
  Range: AdaptHeaderFilterRange,
  Multi: AdaptHeaderFilterMulti,
};

/**
 * One compact header filter, drawn with this kit's NG-ZORRO controls.
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

  /** This kit's NG-ZORRO controls. */
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

  /** This kit's NG-ZORRO controls. */
  protected readonly slots = SLOTS;
}
