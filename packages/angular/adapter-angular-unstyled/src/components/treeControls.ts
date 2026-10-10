/**
 * The tree's native controls: the chevron, the tree column's cell on
 * desktop, and the disclosure a phone card leads with.
 */
import {
  AdaptIcon,
  AdaptTreeCellChrome,
  AdaptTreeToggleChrome,
  expandChevronIcon,
  type TreeCellProps,
  type TreeToggleButtonProps,
  type TreeToggleProps,
  type TreeToggleSlots,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type TemplateRef,
} from "@angular/core";

/**
 * The chevron that opens or closes a tree node: a native button that states
 * whether the node is open and whether its children are still loading.
 *
 * @public
 */
@Component({
  selector: "adapt-tree-button",
  imports: [AdaptIcon],
  styles: `
    .tree-chevron {
      display: inline-flex;
    }
    .tree-chevron:dir(rtl) {
      transform: scaleX(-1);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <button
      type="button"
      data-adapttable-part="tree-toggle"
      [class]="p.className ?? ''"
      [attr.aria-expanded]="p.expanded"
      [attr.aria-label]="p.label"
      [attr.data-loading]="p.loading ? '' : null"
      [attr.aria-busy]="p.loading ? true : null"
      style="
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5em;
        height: 1.5em;
        flex-shrink: 0;
        padding: 0;
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
      "
      (click)="p.onClick()"
    >
      <span aria-hidden="true" class="tree-chevron">
        <svg [adaptIcon]="chevron()"></svg>
      </span>
    </button>
  `,
})
export class AdaptTreeButton {
  /** The chevron's state and handler. */
  readonly props = input.required<TreeToggleButtonProps>();

  /** The descriptor supplies shape and expansion; CSS follows inherited RTL. */
  protected readonly chevron = computed(() =>
    expandChevronIcon({ open: this.props().expanded })
  );
}

/** The kit's components for the tree's parts. */
const TREE_SLOTS: TreeToggleSlots = { Button: AdaptTreeButton };

/**
 * What the tree column's cell receives: core's tree-cell props, with the
 * cell's own content as a template the cell draws after its chevron.
 *
 * @public
 */
export type TreeCellSlotProps = TreeCellProps<unknown, TemplateRef<unknown>>;

/**
 * The tree column's cell, drawn with a native chevron — the `TREE_CELL`
 * slot's component.
 *
 * @public
 */
@Component({
  selector: "adapt-tree-cell",
  imports: [AdaptTreeCellChrome, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <adapt-tree-cell-chrome
      [entry]="p.entry"
      [columnKey]="p.columnKey"
      [treeColumnKey]="p.treeColumnKey"
      [labels]="p.labels"
      [onToggle]="p.onToggle"
      [className]="p.className"
      [toggleClassName]="p.toggleClassName"
      [spacerClassName]="p.spacerClassName"
      [slots]="slots"
      ><ng-container [ngTemplateOutlet]="p.children"
    /></adapt-tree-cell-chrome>
  `,
})
export class AdaptTreeCell {
  /** The cell, its place in the tree, and its content. */
  readonly props = input.required<TreeCellSlotProps>();
  /** @internal */
  protected readonly slots = TREE_SLOTS;
}

/**
 * A phone card's tree disclosure, drawn with a native chevron — the
 * `TREE_TOGGLE` slot's component.
 *
 * @public
 */
@Component({
  selector: "adapt-tree-toggle",
  imports: [AdaptTreeToggleChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <adapt-tree-toggle-chrome
      [entry]="p.entry"
      [labels]="p.labels"
      [onToggle]="p.onToggle"
      [toggleClassName]="p.toggleClassName"
      [spacerClassName]="p.spacerClassName"
      [slots]="slots"
    />
  `,
})
export class AdaptTreeToggle {
  /** The node and its handler. */
  readonly props = input.required<TreeToggleProps<unknown>>();
  /** @internal */
  protected readonly slots = TREE_SLOTS;
}
