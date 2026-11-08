import {
  AdaptAttrs,
  AdaptDesktopStructure,
  AdaptDesktopTableHost,
  AdaptHeader,
  AdaptHeaderTemplate,
  AdaptHeaderTemplateSlot,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";

import { HlmButton, SpartanSelection } from "../helm/controls";
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
    AdaptAttrs,
    AdaptColumnHeaderRename,
    AdaptHeaderTemplate,
    AdaptDesktopStructure,
    AdaptHeader,
    AdaptRowActions,
    HlmButton,
    NgTemplateOutlet,
    SpartanSelection,
  ],
  templateUrl: "./desktopTable.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
})
export class AdaptDesktopTable<TRow> extends AdaptDesktopTableHost<TRow> {}
