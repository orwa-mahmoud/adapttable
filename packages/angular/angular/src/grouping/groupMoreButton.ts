/**
 * The offer that reveals the next page of groups, or of a group's rows.
 *
 * Wording and the part name stay here so they cannot drift. Kits pass the
 * button the end user clicks.
 */
import type {
  GroupMoreButtonProps,
  GroupMoreButtonSlotProps,
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
  GroupMoreButtonProps,
  GroupMoreButtonSlotProps,
} from "@adapttable/core/binding";

/**
 * Kit-supplied controls for {@link AdaptGroupMoreButtonChrome}.
 *
 * @public
 */
export interface GroupMoreButtonSlots {
  /** Renders a button; receives {@link GroupMoreButtonSlotProps}. */
  readonly Button: Type<unknown>;
}

/**
 * Renders the offer through the kit's button.
 *
 * @public
 */
@Component({
  selector: "adapt-group-more-button-chrome",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <ng-container
      [adaptControl]="slots().Button"
      [adaptControlProps]="buttonProps()"
    />
  `,
})
export class AdaptGroupMoreButtonChrome {
  /** Groups or rows. */
  readonly scope = input.required<GroupMoreButtonProps["scope"]>();
  /** How many are still hidden. */
  readonly remaining = input.required<number>();
  /** The group whose rows are revealed, for a `"rows"` offer. */
  readonly groupKey = input<string>();
  /** Resolved labels. */
  readonly labels = input.required<GroupMoreButtonProps["labels"]>();
  /** Reveal the next page. */
  readonly onShowMore = input.required<GroupMoreButtonProps["onShowMore"]>();
  /** The kit's components for each part. */
  readonly slots = input.required<GroupMoreButtonSlots>();

  protected readonly buttonProps = computed((): GroupMoreButtonSlotProps => {
    const scope = this.scope();
    const remaining = this.remaining();
    const labels = this.labels();
    const groupKey = this.groupKey();
    const onShowMore = this.onShowMore();
    return {
      label:
        scope === "groups"
          ? labels.moreGroups(remaining)
          : labels.moreRowsInGroup(remaining),
      onClick: () => {
        onShowMore({ scope, groupKey });
      },
    };
  });
}
