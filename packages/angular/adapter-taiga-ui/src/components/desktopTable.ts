import {
  AdaptAttrs,
  AdaptDesktopStructure,
  AdaptHeader,
  AdaptHeaderTemplate,
  AdaptHeaderTemplateSlot,
  type TableView,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  viewChild,
} from "@angular/core";

import { TAIGA_CONTROLS } from "../taigaControls";
import { AdaptColumnHeaderRename } from "./columnHeaderRename";
import { AdaptRowActions } from "./rowActionButtons";

/**
 * The desktop table body. Layout, rows and part names come from
 * {@link AdaptDesktopStructure}; this kit fills the slots with its own elements.
 *
 * @internal
 */
@Component({
  selector: "adapt-desktop-table",
  providers: [AdaptHeaderTemplateSlot],
  imports: [
    ...TAIGA_CONTROLS,
    AdaptAttrs,
    AdaptColumnHeaderRename,
    AdaptHeaderTemplate,
    AdaptDesktopStructure,
    AdaptHeader,
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
  /** The header-cell template the table view registers. */
  protected readonly header = inject(AdaptHeaderTemplateSlot);

  /** The scroll box the shell virtualizes against. */
  scrollElement(): HTMLElement | null {
    return this.structure()?.scrollElement() ?? null;
  }
}
