/**
 * The tree toggle's layout. The leaf spacer stays here (display only); kits
 * pass the chevron button the end user clicks.
 */
import { resolveLabels } from "@adapttable/core";
import type {
  TableLabels,
  TreeEntry,
  TreeToggleButtonProps,
} from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Type,
} from "@angular/core";

import { AdaptControl } from "../control";

export type {
  TreeToggleButtonProps,
  TreeToggleProps,
} from "@adapttable/core/binding";

/**
 * Kit-supplied controls for {@link AdaptTreeToggleChrome}.
 *
 * @public
 */
export interface TreeToggleSlots {
  /** Renders the chevron; receives `TreeToggleButtonProps`. */
  readonly Button: Type<unknown>;
}

/**
 * The chevron for a row with children, or an equal-width spacer for a leaf
 * so the column stays aligned.
 *
 * @public
 */
@Component({
  selector: "adapt-tree-toggle-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (buttonProps(); as props) {
      <ng-container
        [adaptControl]="slots().Button"
        [adaptControlProps]="props"
      />
    } @else {
      <span
        aria-hidden="true"
        data-adapttable-part="tree-spacer"
        [class]="spacerClassName() ?? ''"
        style="display: inline-block; width: 1.5em; flex-shrink: 0"
      ></span>
    }
  `,
})
export class AdaptTreeToggleChrome {
  /** The row's place in the tree. */
  readonly entry = input.required<TreeEntry<unknown>>();
  /** Labels; falls back to the built-in English. */
  readonly labels = input<TableLabels>();
  /** Open or close a node. */
  readonly onToggle = input.required<(id: string) => void>();
  /** Class for the chevron. */
  readonly toggleClassName = input<string>();
  /** Class for a leaf's placeholder. */
  readonly spacerClassName = input<string>();
  /** The kit's components for each part. */
  readonly slots = input.required<TreeToggleSlots>();

  /** The chevron's props, or `undefined` for a leaf. @internal */
  protected readonly buttonProps = computed(
    (): TreeToggleButtonProps | undefined => {
      const entry = this.entry();
      if (!entry.hasChildren) return undefined;
      const labels = resolveLabels(this.labels());
      const onToggle = this.onToggle();
      return {
        label: entry.expanded ? labels.collapseRow : labels.expandRow,
        expanded: entry.expanded,
        loading: entry.loading === true,
        className: this.toggleClassName(),
        onClick: () => {
          onToggle(entry.key);
        },
      };
    }
  );
}
