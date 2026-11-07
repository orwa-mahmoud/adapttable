/**
 * The desktop table body: header, rows, reorder handles and cell editors.
 */
import {
  AdaptAttrs,
  AdaptDesktopStructure,
  type TableView,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  viewChild,
} from "@angular/core";

import { AdaptColumnHeaderRename } from "./columnHeaderRename";
import { AdaptRowActions } from "./rowActionButtons";

/**
 * The desktop table drawn with native elements. Layout, rows and part names
 * come from {@link AdaptDesktopStructure}; this kit fills the slots.
 *
 * @internal
 */
@Component({
  selector: "adapt-desktop-table",
  imports: [
    AdaptAttrs,
    AdaptColumnHeaderRename,
    AdaptDesktopStructure,
    AdaptRowActions,
    NgTemplateOutlet,
  ],
  templateUrl: "./desktopTable.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
})
export class AdaptDesktopTable<TRow> {
  readonly view = input.required<TableView<TRow>>();
  readonly rowKey = input.required<(row: TRow) => string>();
  readonly maxHeight = input<number | string>();
  private readonly structure = viewChild(AdaptDesktopStructure);

  /** The scroll box the shell virtualizes against. */
  scrollElement(): HTMLElement | null {
    return this.structure()?.scrollElement() ?? null;
  }
}
