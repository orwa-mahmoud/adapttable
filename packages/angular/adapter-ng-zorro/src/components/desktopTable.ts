/**
 * The desktop table body: header, rows, reorder handles and cell editors.
 */
import type { Attrs } from "@adapttable/angular";
import {
  AdaptAttrs,
  AdaptCell,
  AdaptColumnSpacer,
  AdaptDesktopTableModel,
  AdaptExtraRowContent,
  AdaptFooter,
  AdaptHeader,
  AdaptHeaderActions,
  AdaptRowDetail,
  AdaptSlot,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  viewChild,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzTableModule } from "ng-zorro-antd/table";

import { AdaptColumnHeaderRename } from "./columnHeaderRename";
import { AdaptRowActions } from "./rowActionButtons";
import { AdaptSelectionCheckbox } from "./selectionCheckbox";

/**
 * The NG-ZORRO desktop table: sticky header, body rows,
 * selection, reorder and in-place cell editors.
 *
 * Editable cells go through the {@link EDITABLE_CELL} slot when editing is
 * composed; otherwise the column cell renders as usual.
 *
 * @internal
 */
@Component({
  selector: "adapt-desktop-table",
  imports: [
    NzButtonModule,
    NzTableModule,
    AdaptSelectionCheckbox,
    AdaptAttrs,
    AdaptCell,
    AdaptColumnHeaderRename,
    AdaptColumnSpacer,
    AdaptExtraRowContent,
    AdaptFooter,
    AdaptHeader,
    AdaptHeaderActions,
    AdaptRowActions,
    AdaptRowDetail,
    AdaptSlot,
    NgTemplateOutlet,
  ],
  templateUrl: "./desktopTable.html",
  styleUrl: "./desktopTable.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
})
export class AdaptDesktopTable<TRow> extends AdaptDesktopTableModel<TRow> {
  private readonly kitTable = viewChild<
    ElementRef<HTMLElement>,
    ElementRef<HTMLElement>
  >("kitTable", { read: ElementRef });

  protected readonly tableAttrs = computed((): Attrs => ({
    ...(this.view().grid?.tableAttrs() ?? this.view().table.tableAttrs()),
    "data-adapttable-part": "table",
  }));

  /**
   * NG-ZORRO's host names the composite grid for styling; its single generated
   * table owns all roles, refs and keyboard props. React AntD instead needs a
   * semantic wrapper because its sticky header splits into sibling tables.
   */
  protected readonly tableElement = (): HTMLTableElement | null =>
    this.kitTable()?.nativeElement.querySelector("table") ?? null;
}
