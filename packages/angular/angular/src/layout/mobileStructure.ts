/**
 * The one mobile card list every Angular kit renders.
 *
 * The list, the virtual spacer, the group and summary cards, and the field
 * loop live here. A kit fills the slots that are actually its own elements:
 * the spacer mark, the card surface, the checkbox, a field row when the kit
 * draws one, and the row actions.
 */
import { NgComponentOutlet, NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type TemplateRef,
} from "@angular/core";

import { AdaptAttrs } from "../attrs";
import { AdaptCell } from "../cell";
import { AdaptExtraRowContent } from "../rows/extraRowContent";
import { AdaptSlot } from "../slots";
import { AdaptRowDetail } from "../tree/nestedTable";
import { AdaptMobileCardsModel } from "./mobileCardsModel";

/**
 * The elements a kit draws inside {@link AdaptMobileStructure}.
 *
 * `card` wraps one card's interior. Absent, the interior is the card.
 * `field` replaces one field row. Absent, the row is the shared div.
 *
 * @public
 */
export interface AdaptMobileSlots {
  readonly spacer: TemplateRef<unknown>;
  readonly checkbox: TemplateRef<unknown>;
  readonly rowActions: TemplateRef<unknown>;
  readonly card?: TemplateRef<unknown>;
  readonly field?: TemplateRef<unknown>;
}

/**
 * Layout and part names for the phone cards. Kits supply the elements.
 *
 * @public
 */
@Component({
  selector: "adapt-mobile-structure",
  imports: [
    AdaptAttrs,
    AdaptCell,
    AdaptExtraRowContent,
    AdaptRowDetail,
    AdaptSlot,
    NgComponentOutlet,
    NgTemplateOutlet,
  ],
  templateUrl: "./mobileStructure.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
})
export class AdaptMobileStructure<TRow> extends AdaptMobileCardsModel<TRow> {
  /** The kit's card elements. */
  readonly slots = input.required<AdaptMobileSlots>();
}
