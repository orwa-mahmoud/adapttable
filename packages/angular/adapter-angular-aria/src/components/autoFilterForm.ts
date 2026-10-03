/**
 * The auto-built filter form: one native field per definition — a text
 * field with its operator, a yes/no select, a select, a group of checkboxes,
 * a checklist, or an operator-first number or date range.
 */
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

import { CHECKLIST_SLOTS } from "./checklistFilter";

/** A field's column stack: the caption is a flex item, so `gap` applies. */
const FIELD_STACK =
  "display: flex; flex-direction: column; gap: 16px; min-width: 0; margin: 0; padding: 0; border: 0";

/** A fresh id for a field's caption, which its group is labelled by. */

/** A text filter: its operator and its value. @internal */
@Component({
  selector: "adapt-text-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: contents" },
  template: `
    @let w = widget();
    <fieldset
      data-adapttable-part="filter-field"
      [attr.aria-labelledby]="id"
      [style]="stack"
    >
      <div data-adapttable-part="filter-label" [id]="id">{{ w.label }}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px">
        <select
          data-adapttable-part="filter-operator"
          style="flex: 0 0 8.5rem; width: 8.5rem"
          [attr.aria-label]="labels().operator"
          [value]="w.op"
          (change)="pickOp($any($event.target).value)"
        >
          @for (op of w.ops; track op) {
            <option [value]="op" [selected]="op === w.op">
              {{ opLabel(w.opLabelKeys[op]) }}
            </option>
          }
        </select>
        @if (w.needsValue) {
          <input
            type="text"
            data-adapttable-part="filter-input"
            [attr.aria-label]="w.label"
            [attr.placeholder]="def().placeholder ?? null"
            [value]="w.value"
            (input)="w.write(w.op, $any($event.target).value)"
          />
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
  selector: "adapt-boolean-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: contents" },
  template: `
    @let w = widget();
    <label data-adapttable-part="filter-field" [style]="stack">
      <span data-adapttable-part="filter-label">{{ w.label }}</span>
      <select
        data-adapttable-part="filter-select"
        [attr.aria-label]="w.label"
        [value]="w.choice"
        (change)="pick($any($event.target).value)"
      >
        <option value="" [selected]="w.choice === ''">
          {{ labels().boolAny }}
        </option>
        <option value="true" [selected]="w.choice === 'true'">
          {{ labels().boolTrue }}
        </option>
        <option value="false" [selected]="w.choice === 'false'">
          {{ labels().boolFalse }}
        </option>
      </select>
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
  selector: "adapt-select-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: contents" },
  template: `
    @let value = current();
    <label data-adapttable-part="filter-field" [style]="stack">
      <span data-adapttable-part="filter-label">{{ caption() }}</span>
      <select
        data-adapttable-part="filter-select"
        [value]="value"
        (change)="source().setExtra(def().key, $any($event.target).value)"
      >
        @if (options().loading) {
          <option value="" disabled>…</option>
        } @else {
          <option value="" [selected]="value === ''">
            {{ labels().filterAll }}
          </option>
          @for (option of options().options; track option.value) {
            <option [value]="option.value" [selected]="option.value === value">
              {{ option.label }}
            </option>
          }
        }
      </select>
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
  selector: "adapt-multi-select-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: contents" },
  template: `
    <fieldset
      data-adapttable-part="filter-field"
      [attr.aria-labelledby]="id"
      [style]="stack"
    >
      <div data-adapttable-part="filter-label" [id]="id">{{ caption() }}</div>
      <div
        data-adapttable-part="filter-checkbox-group"
        style="display: flex; flex-wrap: wrap; gap: 10px; overflow: auto"
        [style.max-height.px]="listHeight"
      >
        @if (options().loading) {
          <span data-adapttable-part="filter-options-loading">…</span>
        } @else {
          @for (option of options().options; track option.value) {
            <label data-adapttable-part="filter-checkbox">
              <input
                type="checkbox"
                [checked]="selected().includes(option.value)"
                (change)="toggle(option.value, $any($event.target).checked)"
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
  selector: "adapt-range-filter-field",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: contents" },
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
        <select
          data-adapttable-part="filter-operator"
          style="flex: 0 0 8.5rem; width: 8.5rem"
          [attr.aria-label]="l.operator"
          [value]="w.op ?? ''"
          (change)="pickOp($any($event.target).value)"
        >
          <option value="" [selected]="w.op === undefined">
            {{ l.operator }}
          </option>
          @for (op of w.ops; track op) {
            <option [value]="op" [selected]="op === w.op">
              {{ opLabel(op) }}
            </option>
          }
        </select>
        @if (w.arity === "two") {
          <input
            data-adapttable-part="filter-input"
            style="flex: 1 1 7rem; min-width: 7rem"
            [type]="w.inputType"
            [attr.placeholder]="l.from"
            [attr.aria-label]="l.from"
            [value]="w.a"
            (input)="w.write(w.op, $any($event.target).value, w.b)"
          />
          <input
            data-adapttable-part="filter-input"
            style="flex: 1 1 7rem; min-width: 7rem"
            [type]="w.inputType"
            [attr.placeholder]="l.to"
            [attr.aria-label]="l.to"
            [value]="w.b"
            (input)="w.write(w.op, w.a, $any($event.target).value)"
          />
        }
        @if (w.op === "relative") {
          @let token = relative();
          <select
            data-adapttable-part="filter-input"
            style="flex: 1 1 8.5rem; min-width: 8.5rem"
            [attr.aria-label]="l.opRelative"
            [value]="token.preset"
            (change)="pickPreset($any($event.target).value)"
          >
            @for (preset of presets; track preset) {
              <option [value]="preset" [selected]="preset === token.preset">
                {{ presetLabel(preset) }}
              </option>
            }
          </select>
          @if (token.preset === "last" || token.preset === "next") {
            <input
              type="number"
              min="1"
              data-adapttable-part="filter-input"
              style="flex: 0 0 4.5rem; width: 4.5rem"
              [attr.aria-label]="l.value"
              [value]="token.n"
              (input)="pickCount($any($event.target).value)"
            />
          }
        }
        @if (
          w.op !== undefined &&
          w.op !== "relative" &&
          w.arity !== "none" &&
          w.arity !== "two"
        ) {
          <input
            data-adapttable-part="filter-input"
            style="flex: 1 1 7rem; min-width: 7rem"
            [type]="w.inputType"
            [attr.placeholder]="l.value"
            [attr.aria-label]="l.value"
            [value]="w.a"
            (input)="w.write(w.op, $any($event.target).value, '')"
          />
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
  host: { class: "adapt-aria", style: "display: contents" },
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
