/**
 * Find-bar layout. Structure only — adapters pass the search field and
 * the previous / next / close buttons the reader clicks.
 */
import {
  findMatchCountText,
  focusEditorOnMount,
  handleFindBarKey,
  resolveLabels,
  type TableLabels,
} from "@adapttable/core";
import type {
  FindButtonProps,
  FindInTableState,
  FindSearchProps,
} from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Type,
} from "@angular/core";

import { AdaptControl } from "../control";

/**
 * The kit's controls for {@link AdaptFindBarChrome}. Each is a standalone
 * component with one `props` input: {@link FindSearchProps} or
 * {@link FindButtonProps}.
 *
 * @public
 */
export interface FindBarSlots {
  /** The search box. */
  readonly Search: Type<unknown>;
  /** A previous, next or close button. */
  readonly Button: Type<unknown>;
}

/**
 * Renders the find bar, or nothing when it is closed — so an adapter renders
 * it unconditionally and the opt-in promise still holds.
 *
 * Enter walks forward, Shift+Enter walks back and Escape closes, which is
 * what every find bar does and therefore what nobody should have to learn.
 *
 * @public
 */
@Component({
  selector: "adapt-find-bar-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl],
  host: { style: "display: contents" },
  template: `
    @if (find().open) {
      <div
        data-adapttable-part="find-bar"
        [class]="className()"
        style="display: flex; align-items: center; gap: 0.5em; padding: 0.25em 0"
      >
        <ng-container
          [adaptControl]="slots().Search"
          [adaptControlProps]="searchProps()"
        />
        <output data-adapttable-part="find-count">{{ count() }}</output>
        <ng-container
          [adaptControl]="slots().Button"
          [adaptControlProps]="previousProps()"
        />
        <ng-container
          [adaptControl]="slots().Button"
          [adaptControlProps]="nextProps()"
        />
        <ng-container
          [adaptControl]="slots().Button"
          [adaptControlProps]="closeProps()"
        />
      </div>
    }
  `,
})
export class AdaptFindBarChrome {
  /** The find state, straight from the table. */
  readonly find = input.required<FindInTableState>();
  /** Labels; falls back to the built-in English. */
  readonly labels = input<TableLabels>();
  protected readonly copy = computed(() => resolveLabels(this.labels()));
  /** A kit's own class for the bar. */
  readonly className = input<string>();
  /** The kit's search field and buttons. */
  readonly slots = input.required<FindBarSlots>();

  /** "3 of 12", or the host's own wording. */
  protected readonly count = computed(() => {
    const find = this.find();
    return findMatchCountText(this.copy(), find.index, find.matches.length);
  });

  /** The search field's props, including the keys the bar owns. */
  protected readonly searchProps = computed((): FindSearchProps => {
    const find = this.find();
    const labels = this.copy();
    return {
      label: labels.findInTable,
      placeholder: labels.findPlaceholder,
      value: find.query,
      focusRef: focusEditorOnMount,
      onChange: find.setQuery,
      onKeyDown: (event) => {
        handleFindBarKey(event, find);
      },
    };
  });

  /** Previous match. */
  protected readonly previousProps = computed((): FindButtonProps => {
    const find = this.find();
    return {
      label: this.copy().findPrevious,
      part: "find-previous",
      kind: "previous",
      disabled: find.matches.length === 0,
      onClick: find.previous,
    };
  });

  /** Next match. */
  protected readonly nextProps = computed((): FindButtonProps => {
    const find = this.find();
    return {
      label: this.copy().findNext,
      part: "find-next",
      kind: "next",
      disabled: find.matches.length === 0,
      onClick: find.next,
    };
  });

  /** Close the bar. */
  protected readonly closeProps = computed((): FindButtonProps => ({
    label: this.copy().findClose,
    part: "find-close",
    kind: "close",
    onClick: () => {
      this.find().setOpen(false);
    },
  }));
}
