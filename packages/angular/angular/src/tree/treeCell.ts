/**
 * The tree column's cell: the chevron, the indent, and the cell's own content
 * on one line.
 *
 * The indent belongs to the whole cell, not to the chevron: indenting only
 * the control leaves every name at the same margin, so a hierarchy reads as a
 * flat list with chevrons scattered through it. Any other column shows its
 * content untouched, which lets a kit wrap every cell in one place.
 */
import { treeIndentStyle } from "@adapttable/core";
import type { TableLabels, TreeEntry } from "@adapttable/core/binding";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

import { AdaptTreeToggleChrome, type TreeToggleSlots } from "./treeToggle";

/** Keeps a closed node's toggle inert when no handler is given. */
const IGNORE_TOGGLE = (): void => undefined;

/**
 * Wraps projected cell content in its tree chrome on the tree column, and
 * shows it unchanged everywhere else.
 *
 * ```html
 * <adapt-tree-cell-chrome [entry]="entry" [columnKey]="column.key"
 *   [treeColumnKey]="treeKey" [onToggle]="toggle" [slots]="slots">
 *   {{ row.name }}
 * </adapt-tree-cell-chrome>
 * ```
 *
 * @public
 */
@Component({
  selector: "adapt-tree-cell-chrome",
  imports: [AdaptTreeToggleChrome, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    <ng-template #content><ng-content /></ng-template>
    @if (treeEntry(); as entry) {
      <span
        data-adapttable-part="tree-cell"
        [class]="className() ?? ''"
        [style]="wrapperStyle()"
      >
        <adapt-tree-toggle-chrome
          [entry]="entry"
          [labels]="labels()"
          [onToggle]="onToggle() ?? ignoreToggle"
          [toggleClassName]="toggleClassName()"
          [spacerClassName]="spacerClassName()"
          [slots]="slots()"
        />
        <ng-container [ngTemplateOutlet]="content" />
      </span>
    } @else {
      <ng-container [ngTemplateOutlet]="content" />
    }
  `,
})
export class AdaptTreeCellChrome {
  /** The row's place in the tree; absent on a flat table. */
  readonly entry = input<TreeEntry<unknown>>();
  /** This cell's column. */
  readonly columnKey = input.required<string>();
  /** The column that carries the chevron. */
  readonly treeColumnKey = input<string>();
  /** Labels; falls back to the built-in English. */
  readonly labels = input<TableLabels>();
  /** Open or close a node. */
  readonly onToggle = input<(id: string) => void>();
  /** Class for the wrapper. */
  readonly className = input<string>();
  /** Class for the chevron. */
  readonly toggleClassName = input<string>();
  /** Class for a leaf's placeholder. */
  readonly spacerClassName = input<string>();
  /** The kit's components for each part. */
  readonly slots = input.required<TreeToggleSlots>();

  /** @internal */
  protected readonly ignoreToggle = IGNORE_TOGGLE;

  /** The entry, while this cell is the tree column's. @internal */
  protected readonly treeEntry = computed(() => {
    const entry = this.entry();
    return entry !== undefined && this.columnKey() === this.treeColumnKey()
      ? entry
      : undefined;
  });

  /** The wrapper's layout and its depth's indent. @internal */
  protected readonly wrapperStyle = computed(() => ({
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    ...treeIndentStyle(this.treeEntry()?.level ?? 0),
  }));
}
