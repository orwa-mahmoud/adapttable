/**
 * The desktop table body: header, rows, reorder handles and cell editors.
 */
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
} from "@adapttable/angular";
import { A11yModule } from "@angular/cdk/a11y";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";

import { AdaptColumnHeaderRename } from "./columnHeaderRename";
import { AdaptRowActions } from "./rowActionButtons";

/**
 * The desktop table drawn with native elements: sticky header, body rows,
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
    A11yModule,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
})
export class AdaptDesktopTable<TRow> extends AdaptDesktopTableModel<TRow> {}
