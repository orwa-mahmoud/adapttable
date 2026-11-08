import { Directive, inject, Injectable, TemplateRef } from "@angular/core";

/**
 * The header-cell template a kit declares inside its table template, so the
 * header cell and the table are one view tree. A kit provides it on its
 * desktop table and outlets `template` where the structure draws a header
 * cell.
 *
 * @public
 */
@Injectable()
export class AdaptHeaderTemplateSlot {
  /** The kit's header-cell template, once its table view has rendered. */
  template: TemplateRef<unknown> | null = null;
}

/**
 * Marks a kit's header-cell template and hands it to the nearest
 * {@link AdaptHeaderTemplateSlot}.
 *
 * @public
 */
@Directive({ selector: "ng-template[adaptHeaderTemplate]" })
export class AdaptHeaderTemplate {
  constructor() {
    inject(AdaptHeaderTemplateSlot).template = inject(TemplateRef);
  }
}
