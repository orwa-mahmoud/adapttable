/**
 * A full-width extra row's content: what the host's `render` returns, drawn
 * as a template, a standalone component, or text.
 */
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  TemplateRef,
  type Type,
} from "@angular/core";

import { primitiveText } from "../primitiveText";

// A compiled Angular component carries its definition as `ɵcmp`.
function isComponentType(value: unknown): value is Type<unknown> {
  return typeof value === "function" && "ɵcmp" in value;
}

/**
 * Renders a full-width extra row's content into the element it sits on:
 * `<td [adaptExtraRowContent]="slot.render">`. The host's `render` may
 * return an `ng-template`, a standalone component, or plain text.
 *
 * @public
 */
@Component({
  selector: "[adaptExtraRowContent]",
  imports: [NgTemplateOutlet, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (template(); as template) {
      <ng-container [ngTemplateOutlet]="template" />
    } @else if (component(); as component) {
      <ng-container [ngComponentOutlet]="component" />
    } @else {
      {{ text() }}
    }`,
})
export class AdaptExtraRowContent {
  /** The row's `render`; a separator has none. */
  readonly render = input<(() => unknown) | undefined>(undefined, {
    alias: "adaptExtraRowContent",
  });

  /** What `render` returned. */
  protected readonly content = computed(() => this.render()?.());

  /** The template, when `render` returned one. */
  protected readonly template = computed(() => {
    const value = this.content();
    return value instanceof TemplateRef ? value : null;
  });

  /** The component, when `render` returned one. */
  protected readonly component = computed((): Type<unknown> | null => {
    const value = this.content();
    return isComponentType(value) ? value : null;
  });

  /** The text, otherwise. */
  protected readonly text = computed(() => primitiveText(this.content()) ?? "");
}
