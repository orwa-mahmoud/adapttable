import {
  AdaptAttrs,
  AdaptMobileCardsHost,
  AdaptMobileStructure,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from "@angular/core";
import { MatCardModule } from "@angular/material/card";

import { AdaptRowActions } from "./rowActionButtons";
import { AdaptSelectionCheckbox } from "./selectionCheckbox";

/**
 * The phone card list. Layout comes from {@link AdaptMobileStructure}; this
 * kit fills the slots and keeps its own card styles.
 *
 * @internal
 */
@Component({
  selector: "adapt-mobile-cards",
  imports: [
    AdaptAttrs,
    AdaptMobileStructure,
    AdaptRowActions,
    AdaptSelectionCheckbox,
    MatCardModule,
    NgTemplateOutlet,
  ],
  templateUrl: "./mobileCards.html",
  styleUrl: "./mobileCards.css",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents", class: "adapt-material-mobile" },
})
export class AdaptMobileCards<TRow> extends AdaptMobileCardsHost<TRow> {}
