/**
 * The collapse control on a column group's header cell. Kits pass the button
 * the reader presses; the wording stays here so it cannot drift.
 */
import type { TableLabels } from "@adapttable/core";
import type {
  ColumnGroupToggleButtonProps,
  HeaderGroupCell,
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
  ColumnGroupToggleButtonProps,
  ColumnGroupToggleProps,
} from "@adapttable/core/binding";

/**
 * Kit-supplied controls for {@link AdaptColumnGroupToggleChrome}.
 *
 * @public
 */
export interface ColumnGroupToggleSlots {
  /** Renders the button; receives `ColumnGroupToggleButtonProps`. */
  readonly Button: Type<unknown>;
}

/**
 * Collapses or expands one column group, through the kit's button. Draws
 * nothing on a group that cannot collapse.
 *
 * @public
 */
@Component({
  selector: "adapt-column-group-toggle-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (buttonProps(); as props) {
      <ng-container
        [adaptControl]="slots().Button"
        [adaptControlProps]="props"
      />
    }
  `,
})
export class AdaptColumnGroupToggleChrome {
  /** The group's header cell. */
  readonly cell = input.required<HeaderGroupCell>();
  /** Resolved labels. */
  readonly labels = input.required<Required<TableLabels>>();
  /** Collapse or expand a group by id. */
  readonly onToggle = input.required<(id: string) => void>();
  /** Class for the button. */
  readonly className = input<string>();
  /** The kit's components for each part. */
  readonly slots = input.required<ColumnGroupToggleSlots>();

  /** The button's props, or `undefined` when the group cannot collapse. @internal */
  protected readonly buttonProps = computed(
    (): ColumnGroupToggleButtonProps | undefined => {
      const cell = this.cell();
      const id = cell.id;
      if (!cell.collapsible || id === null) return undefined;
      const labels = this.labels();
      const action = cell.collapsed
        ? labels.expandColumnGroup
        : labels.collapseColumnGroup;
      const onToggle = this.onToggle();
      return {
        label: cell.label ? `${action}: ${cell.label}` : action,
        expanded: !cell.collapsed,
        className: this.className(),
        onClick: () => {
          onToggle(id);
        },
      };
    }
  );
}
