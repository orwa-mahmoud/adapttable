/**
 * The header checkbox that selects a whole column — the same selection
 * Ctrl/Cmd+click on a header makes, reachable by a finger and by a screen
 * reader. Kits pass the checkbox.
 */
import { defaultLabels } from "@adapttable/core";
import type { ColumnSelectCheckboxProps } from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  type Type,
} from "@angular/core";

import { AdaptControl } from "../control";
import { injectMediaQuery } from "../hooks/mediaQuery";

export type { ColumnSelectCheckboxProps } from "@adapttable/core/binding";

/**
 * A pointer that can hover — where the checkbox waits to be wanted; without
 * one there is no hover to wait for, so the checkbox is simply there.
 */
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * Kit-supplied control for {@link AdaptColumnSelectCheckboxChrome}.
 *
 * @public
 */
export interface ColumnSelectSlots {
  /** Renders the checkbox; receives `ColumnSelectCheckboxProps`. */
  readonly Checkbox: Type<unknown>;
}

/**
 * The checkbox's accessible name: what it does, and which column.
 *
 * @param label - The localized action, e.g. "Select column".
 * @param column - The column's key and header.
 * @returns The name, e.g. "Select column: Budget".
 *
 * @public
 */
export function columnSelectLabel(
  label: string | undefined,
  column: { readonly header?: string; readonly key: string }
): string {
  return `${label ?? defaultLabels.selectColumn}: ${column.header ?? column.key}`;
}

/**
 * The header checkbox that selects a whole column. On a hovering pointer it
 * holds its space and fades in on hover or focus, and a selected column shows
 * its state regardless; elsewhere it is always visible. Clicks do not reach
 * the header, which would sort or select under it, and keys do not reach the
 * grid, where Space is the grid's.
 *
 * @public
 */
@Component({
  selector: "adapt-column-select-checkbox-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <span
      role="none"
      data-adapttable-part="column-select"
      [class]="className() ?? ''"
      [attr.data-shown]="shown() ? '' : null"
      style="display: inline-flex; align-items: center; transition: opacity 120ms ease"
      [style.opacity]="shown() ? 1 : 0"
      (pointerenter)="near.set(true)"
      (pointerleave)="near.set(false)"
      (focusin)="near.set(true)"
      (focusout)="near.set(false)"
      (click)="$event.stopPropagation()"
      (keydown)="$event.stopPropagation()"
    >
      <ng-container
        [adaptControl]="slots().Checkbox"
        [adaptControlProps]="checkboxProps()"
      />
    </span>
  `,
})
export class AdaptColumnSelectCheckboxChrome {
  /** Accessible name, already localized and naming the column. */
  readonly label = input.required<string>();
  /** Whether this column is the selection. */
  readonly checked = input.required<boolean>();
  /** Select this column, or clear the selection when it already is. */
  readonly onToggle = input.required<() => void>();
  /** Class for the wrapper. */
  readonly className = input<string>();
  /** The kit's checkbox. */
  readonly slots = input.required<ColumnSelectSlots>();

  /** Whether the pointer or focus is on the control. @internal */
  protected readonly near = signal(false);
  private readonly canHover = injectMediaQuery(HOVER_QUERY);

  /** Whether the checkbox shows. @internal */
  protected readonly shown = computed(
    () => !this.canHover() || this.near() || this.checked()
  );

  /** The kit checkbox's props. @internal */
  protected readonly checkboxProps = computed(
    (): ColumnSelectCheckboxProps => ({
      label: this.label(),
      checked: this.checked(),
      onToggle: this.onToggle(),
    })
  );
}
