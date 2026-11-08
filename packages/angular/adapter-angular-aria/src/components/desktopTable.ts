import {
  AdaptAttrs,
  AdaptDesktopStructure,
  type TableView,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  inject,
  input,
  TemplateRef,
  viewChild,
} from "@angular/core";

import { AdaptColumnHeaderRename } from "./columnHeaderRename";
import { AdaptRowActions } from "./rowActionButtons";

/**
 * The desktop table body. Layout, rows and part names come from
 * {@link AdaptDesktopStructure}; this kit fills the slots with its own elements.
 *
 * @internal
 */
/** The header cell lives inside the table so the cell and the table are one tree. */
@Directive({ selector: "ng-template[adaptHeaderTemplate]" })
class AdaptHeaderTemplate {
  constructor() {
    inject(AdaptDesktopTable).holdHeader(inject(TemplateRef));
  }
}

@Component({
  selector: "adapt-desktop-table",
  imports: [
    AdaptAttrs,
    AdaptColumnHeaderRename,
    AdaptHeaderTemplate,
    AdaptDesktopStructure,
    AdaptRowActions,
    NgTemplateOutlet,
  ],
  templateUrl: "./desktopTable.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: "adapt-aria", style: "display: contents" },
})
export class AdaptDesktopTable<TRow> {
  readonly view = input.required<TableView<TRow>>();
  readonly rowKey = input.required<(row: TRow) => string>();
  readonly maxHeight = input<number | string>();
  private readonly structure = viewChild(AdaptDesktopStructure);
  protected headerTemplate: TemplateRef<unknown> | null = null;

  /** The table view registers the header cell before the structure draws it. */
  holdHeader(template: TemplateRef<unknown>): void {
    this.headerTemplate = template;
  }

  /** The scroll box the shell virtualizes against. */
  scrollElement(): HTMLElement | null {
    return this.structure()?.scrollElement() ?? null;
  }
}
