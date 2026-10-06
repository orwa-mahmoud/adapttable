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
import { MatCardModule } from "@angular/material/card";

import { AdaptRowActions } from "./rowActionButtons";
import { AdaptSelectionCheckbox } from "./selectionCheckbox";

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
    MatCardModule,
    AdaptSelectionCheckbox,
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
