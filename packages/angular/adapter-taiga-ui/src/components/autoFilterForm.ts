import {
  AdaptAutoFilterFormModel,
  AdaptBooleanFilterFieldModel,
  AdaptChecklistChrome,
  AdaptMultiSelectFilterFieldModel,
  AdaptRangeFilterFieldModel,
  AdaptSelectFilterFieldModel,
  AdaptTextFilterFieldModel,
} from "@adapttable/angular";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";
import { CHECKLIST_SLOTS } from "./checklistFilter";

/**
 * The auto-built filter form: one native field per definition — a text
 * field with its operator, a yes/no select, a select, a group of checkboxes,
 * a checklist, or an operator-first number or date range.
 */

/** A field's column stack: the caption is a flex item, so `gap` applies. */
const FIELD_STACK =
  "display: flex; flex-direction: column; gap: 16px; min-width: 0; margin: 0; padding: 0; border: 0";

/** A fresh id for a field's caption, which its group is labelled by. */

/** A text filter: its operator and its value. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-text-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let w = widget();
    <fieldset
      data-adapttable-part="filter-field"
      [attr.aria-labelledby]="id"
      [style]="stack"
    >
      <div data-adapttable-part="filter-label" [id]="id">{{ w.label }}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px">
        <tui-textfield
          [tuiTextfieldCleaner]="false"
          [stringify]="w.opLabelKeys | taigaLabels: labels()"
          ><input
            tuiSelect
            data-adapttable-part="filter-operator"
            style="flex: 0 0 8.5rem; width: 8.5rem"
            [attr.aria-label]="labels().operator"
            [ngModel]="w.op"
            (ngModelChange)="pickOp($event)"
          /><tui-data-list *tuiDropdown>
            @for (op of w.ops; track op) {
              <button tuiOption type="button" [value]="op">
                {{ opLabel(w.opLabelKeys[op]) }}
              </button>
            }
          </tui-data-list></tui-textfield
        >
        @if (w.needsValue) {
          <tui-textfield
            ><input
              tuiInput
              type="text"
              data-adapttable-part="filter-input"
              [attr.aria-label]="w.label"
              [attr.placeholder]="def().placeholder ?? null"
              [value]="w.value"
              (input)="w.write(w.op, $any($event.target).value)"
          /></tui-textfield>
        }
      </div>
    </fieldset>
  `,
})
export class AdaptTextFilterField<
  TRow,
> extends AdaptTextFilterFieldModel<TRow> {
  protected readonly stack = FIELD_STACK;
}

/** A yes/no filter. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-boolean-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let w = widget();
    <label data-adapttable-part="filter-field" [style]="stack">
      <span data-adapttable-part="filter-label">{{ w.label }}</span>
      <tui-textfield
        [stringify]="
          {
            '': labels().boolAny,
            true: labels().boolTrue,
            false: labels().boolFalse,
          } | taigaLabels
        "
        ><input
          tuiSelect
          data-adapttable-part="filter-select"
          [attr.aria-label]="w.label"
          [ngModel]="w.choice"
          (ngModelChange)="pick($event)"
        /><tui-data-list *tuiDropdown>
          <button tuiOption type="button" value="">
            {{ labels().boolAny }}
          </button>
          <button tuiOption type="button" value="true">
            {{ labels().boolTrue }}
          </button>
          <button tuiOption type="button" value="false">
            {{ labels().boolFalse }}
          </button>
        </tui-data-list></tui-textfield
      >
    </label>
  `,
})
export class AdaptBooleanFilterField<
  TRow,
> extends AdaptBooleanFilterFieldModel<TRow> {
  protected readonly stack = FIELD_STACK;
}

/** The choices of a select or checkbox field, following its definition. */

/** A single-choice filter. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-select-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let value = current();
    <label data-adapttable-part="filter-field" [style]="stack">
      <span data-adapttable-part="filter-label">{{ caption() }}</span>
      <tui-textfield
        [stringify]="
          options().options | taigaLabels: { '': labels().filterAll }
        "
        ><input
          tuiSelect
          data-adapttable-part="filter-select"
          [ngModel]="value"
          (ngModelChange)="source().setExtra(def().key, $event ?? '')"
        /><tui-data-list *tuiDropdown>
          @if (options().loading) {
            <button tuiOption type="button" value="" [disabled]="true">
              …
            </button>
          } @else {
            <button tuiOption type="button" value="">
              {{ labels().filterAll }}
            </button>
            @for (option of options().options; track option.value) {
              <button tuiOption type="button" [value]="option.value">
                {{ option.label }}
              </button>
            }
          }
        </tui-data-list></tui-textfield
      >
    </label>
  `,
})
export class AdaptSelectFilterField<
  TRow,
> extends AdaptSelectFilterFieldModel<TRow> {
  protected readonly stack = FIELD_STACK;
}

/** A multi-choice filter drawn as checkboxes. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-multi-select-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <fieldset
      data-adapttable-part="filter-field"
      [attr.aria-labelledby]="id"
      [style]="stack"
    >
      <div data-adapttable-part="filter-label" [id]="id">{{ caption() }}</div>
      <div
        data-taiga-part="filter-checkbox-group"
        style="display: flex; flex-wrap: wrap; gap: 10px; overflow: auto"
        [style.max-height.px]="listHeight"
      >
        @if (options().loading) {
          <span data-taiga-part="filter-options-loading">…</span>
        } @else {
          @for (option of options().options; track option.value) {
            <label data-adapttable-part="filter-checkbox">
              <input
                tuiCheckbox
                type="checkbox"
                [ngModelOptions]="{ standalone: true }"
                [ngModel]="selected().includes(option.value)"
                (ngModelChange)="toggle(option.value, $event)"
              />
              {{ option.label }}
            </label>
          }
        }
      </div>
    </fieldset>
  `,
})
export class AdaptMultiSelectFilterField<
  TRow,
> extends AdaptMultiSelectFilterFieldModel<TRow> {
  protected readonly stack = FIELD_STACK;
}

/** An operator-first number or date range. @internal */
@Component({
  imports: [...TAIGA_CONTROLS],
  selector: "adapt-range-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let w = widget();
    @let l = labels();
    <fieldset
      data-adapttable-part="filter-field"
      [attr.aria-labelledby]="id"
      [style]="stack"
    >
      <div data-adapttable-part="filter-label" [id]="id">{{ w.label }}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px">
        <tui-textfield
          ><input
            tuiSelect
            data-adapttable-part="filter-operator"
            style="flex: 0 0 8.5rem; width: 8.5rem"
            [attr.aria-label]="l.operator"
            [ngModel]="w.op ?? ''"
            (ngModelChange)="pickOp($event)"
          /><tui-data-list *tuiDropdown>
            <button tuiOption type="button" value="">
              {{ l.operator }}
            </button>
            @for (op of w.ops; track op) {
              <button tuiOption type="button" [value]="op">
                {{ opLabel(op) }}
              </button>
            }
          </tui-data-list></tui-textfield
        >
        @if (w.arity === "two") {
          <tui-textfield
            ><input
              tuiInput
              data-adapttable-part="filter-input"
              style="flex: 1 1 7rem; min-width: 7rem"
              [type]="w.inputType"
              [attr.placeholder]="l.from"
              [attr.aria-label]="l.from"
              [value]="w.a"
              (input)="w.write(w.op, $any($event.target).value, w.b)"
          /></tui-textfield>
          <tui-textfield
            ><input
              tuiInput
              data-adapttable-part="filter-input"
              style="flex: 1 1 7rem; min-width: 7rem"
              [type]="w.inputType"
              [attr.placeholder]="l.to"
              [attr.aria-label]="l.to"
              [value]="w.b"
              (input)="w.write(w.op, w.a, $any($event.target).value)"
          /></tui-textfield>
        }
        @if (w.op === "relative") {
          @let token = relative();
          <tui-textfield [tuiTextfieldCleaner]="false"
            ><input
              tuiSelect
              data-adapttable-part="filter-input"
              style="flex: 1 1 8.5rem; min-width: 8.5rem"
              [attr.aria-label]="l.opRelative"
              [ngModel]="token.preset"
              (ngModelChange)="pickPreset($event)"
            /><tui-data-list *tuiDropdown>
              @for (preset of presets; track preset) {
                <button tuiOption type="button" [value]="preset">
                  {{ presetLabel(preset) }}
                </button>
              }
            </tui-data-list></tui-textfield
          >
          @if (token.preset === "last" || token.preset === "next") {
            <tui-textfield
              ><input
                tuiInput
                type="number"
                min="1"
                data-adapttable-part="filter-input"
                style="flex: 0 0 4.5rem; width: 4.5rem"
                [attr.aria-label]="l.value"
                [value]="token.n"
                (input)="pickCount($any($event.target).value)"
            /></tui-textfield>
          }
        }
        @if (
          w.op !== undefined &&
          w.op !== "relative" &&
          w.arity !== "none" &&
          w.arity !== "two"
        ) {
          <tui-textfield
            ><input
              tuiInput
              data-adapttable-part="filter-input"
              style="flex: 1 1 7rem; min-width: 7rem"
              [type]="w.inputType"
              [attr.placeholder]="l.value"
              [attr.aria-label]="l.value"
              [value]="w.a"
              (input)="w.write(w.op, $any($event.target).value, '')"
          /></tui-textfield>
        }
      </div>
    </fieldset>
  `,
})
export class AdaptRangeFilterField<
  TRow,
> extends AdaptRangeFilterFieldModel<TRow> {
  protected readonly stack = FIELD_STACK;
}

/**
 * The auto-built filter form: one native field per definition.
 *
 * @public
 */
@Component({
  selector: "adapt-auto-filter-form",
  imports: [
    ...TAIGA_CONTROLS,
    AdaptBooleanFilterField,
    AdaptChecklistChrome,
    AdaptMultiSelectFilterField,
    AdaptRangeFilterField,
    AdaptSelectFilterField,
    AdaptTextFilterField,
    NgComponentOutlet,
    NgTemplateOutlet,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @for (field of fields(); track field.def.key) {
      @let def = field.def;
      @if (field.renderer?.template; as template) {
        <ng-container
          [ngTemplateOutlet]="template"
          [ngTemplateOutletContext]="field.context"
        />
      } @else if (field.renderer?.component; as component) {
        <ng-container
          [ngComponentOutlet]="component"
          [ngComponentOutletInputs]="field.renderer.inputs"
        />
      } @else if (field.text; as text) {
        {{ text }}
      } @else {
        @switch (kindOf(def)) {
          @case ("text") {
            <adapt-text-filter-field
              [def]="def"
              [source]="source()"
              [labels]="labels()"
            />
          }
          @case ("boolean") {
            <adapt-boolean-filter-field
              [def]="def"
              [source]="source()"
              [labels]="labels()"
            />
          }
          @case ("select") {
            <adapt-select-filter-field
              [def]="def"
              [source]="source()"
              [labels]="labels()"
            />
          }
          @case ("multiSelect") {
            <adapt-multi-select-filter-field [def]="def" [source]="source()" />
          }
          @case ("checklist") {
            <adapt-checklist-chrome
              [def]="def"
              [source]="source()"
              [labels]="labels()"
              [slots]="checklistSlots"
            />
          }
          @case ("range") {
            <adapt-range-filter-field
              [def]="def"
              [source]="source()"
              [labels]="labels()"
            />
          }
        }
      }
    }
  `,
})
export class AdaptAutoFilterForm<TRow> extends AdaptAutoFilterFormModel<TRow> {
  protected readonly checklistSlots = CHECKLIST_SLOTS;
}
