/**
 * The context menu: an anchor at the point it was opened, then the kit's menu.
 *
 * The kit draws the surface, each entry and the divider. Closing happens
 * before an entry runs, so an entry that opens a dialog does not do it under
 * a menu that is still mounted.
 */
import {
  type ContextMenuItem,
  type ContextMenuPoint,
  resolveLabels,
  type TableLabels,
} from "@adapttable/core";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  type Type,
  viewChild,
} from "@angular/core";

import { AdaptControl } from "../control";

/**
 * The kit's controls for {@link AdaptContextMenuChrome}. Each is a standalone
 * component with one `props` input.
 *
 * @public
 */
export interface ContextMenuSlots {
  /** The menu surface, positioned where it was opened. */
  readonly Surface: Type<unknown>;
  /** One entry. */
  readonly Item: Type<unknown>;
  /** The divider between groups of entries. */
  readonly Separator: Type<unknown>;
}

/**
 * One row the surface draws: the entry, and a select that closes the menu
 * first.
 *
 * @public
 */
export interface ContextMenuRow {
  /** The entry. */
  readonly item: ContextMenuItem;
  /** Close the menu, then run the entry. */
  readonly onSelect: () => void;
}

/**
 * Renders the open context menu, or nothing when it is closed or empty.
 *
 * @public
 */
@Component({
  selector: "adapt-context-menu-chrome",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptControl],
  host: { style: "display: contents" },
  template: `
    @if (at(); as point) {
      @if (items().length > 0) {
        <span
          #anchor
          aria-hidden="true"
          data-adapttable-part="context-menu-anchor"
          [style.position]="'fixed'"
          [style.left.px]="point.x"
          [style.top.px]="point.y"
          [style.width.px]="0"
          [style.height.px]="0"
          [style.pointer-events]="'none'"
        ></span>
        <ng-container
          [adaptControl]="slots().Surface"
          [adaptControlProps]="surfaceProps()"
        />
      }
    }
  `,
})
export class AdaptContextMenuChrome {
  /** The entries. Nothing renders when this is empty. */
  readonly items = input.required<readonly ContextMenuItem[]>();
  /** Where it was opened, or `null` when it is closed. */
  readonly at = input.required<ContextMenuPoint | null>();
  /** Close it, putting focus back where it came from. */
  readonly onClose = input.required<() => void>();
  /** Labels; gaps fall back to English. */
  readonly labels = input<TableLabels | undefined>(undefined);
  /** A kit's own class for the menu. */
  readonly className = input<string | undefined>(undefined);
  /** The kit's surface, entry and divider. */
  readonly slots = input.required<ContextMenuSlots>();

  private readonly anchor = viewChild<ElementRef<HTMLElement>>("anchor");

  /** The rows, each already closing the menu before it runs. */
  private readonly rows = computed((): readonly ContextMenuRow[] =>
    this.items().map((item) => ({
      item,
      onSelect: () => {
        this.onClose()();
        item.onSelect();
      },
    }))
  );

  /** Props for the kit's menu. */
  protected readonly surfaceProps = computed(() => {
    const point = this.at();
    return {
      at: point ?? { x: 0, y: 0 },
      anchorRef: { current: this.anchor()?.nativeElement ?? null },
      label: resolveLabels(this.labels()).contextMenu,
      onClose: this.onClose(),
      className: this.className(),
      rows: this.rows(),
      Item: this.slots().Item,
      Separator: this.slots().Separator,
    };
  });
}
