/**
 * The card list rendered in place of the table on narrow screens.
 */
import {
  AdaptAttrs,
  AdaptCell,
  AdaptExtraRowContent,
  AdaptMobileCardsModel,
  AdaptRowDetail,
  AdaptSlot,
} from "@adapttable/angular/adapter";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";

import { SpartanSelection } from "../helm/controls";
import { AdaptRowActions } from "./rowActionButtons";

/**
 * The phone card list drawn with native elements.
 *
 * Editable fields go through the {@link EDITABLE_CELL} slot when editing is
 * composed, matching React's mobile cards.
 *
 * @internal
 */
@Component({
  selector: "adapt-mobile-cards",
  imports: [
    SpartanSelection,
    AdaptAttrs,
    AdaptCell,
    AdaptExtraRowContent,
    AdaptRowActions,
    AdaptRowDetail,
    AdaptSlot,
    NgComponentOutlet,
    NgTemplateOutlet,
  ],
  templateUrl: "./mobileCards.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
})
export class AdaptMobileCards<TRow> extends AdaptMobileCardsModel<TRow> {}
