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
} from "@adapttable/angular";
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";

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
  host: { class: "adapt-aria", style: "display: contents" },
})
export class AdaptMobileCards<TRow> extends AdaptMobileCardsModel<TRow> {}
