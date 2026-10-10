import { Directive, inject, input, TemplateRef } from "@angular/core";

import { type CellContext } from "./columnDef";

/**
 * A cell template declared in a component's own template:
 * `<ng-template adaptCellTemplate="status" let-row>…</ng-template>`. Collect
 * them with `viewChildren(AdaptCellTemplate)` and pass them to
 * `injectDataTable` as `cellTemplates`.
 *
 * @public
 */
@Directive({ selector: "ng-template[adaptCellTemplate]" })
export class AdaptCellTemplate {
  /** The key of the column this template renders. */
  readonly key = input.required<string>({ alias: "adaptCellTemplate" });
  /** The template. */
  readonly template = inject<TemplateRef<CellContext<unknown>>>(TemplateRef);

  /** Type the template's `let-` variables. */
  static ngTemplateContextGuard(
    _directive: AdaptCellTemplate,
    _context: unknown
  ): _context is CellContext<unknown> {
    return true;
  }
}
