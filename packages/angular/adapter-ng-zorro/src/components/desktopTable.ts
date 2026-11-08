import type { Attrs } from "@adapttable/angular";
import {
  AdaptAttrs,
  AdaptDesktopStructure,
  AdaptHeader,
  AdaptTableSurface,
  scrollBoxStyle,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  ViewEncapsulation,
} from "@angular/core";
import { NzButtonModule } from "ng-zorro-antd/button";
import { NzTableModule } from "ng-zorro-antd/table";

import { AdaptColumnHeaderRename } from "./columnHeaderRename";
import { AdaptRowActions } from "./rowActionButtons";
import { AdaptSelectionCheckbox } from "./selectionCheckbox";

/** Tells the kit where NG-ZORRO mounted its table host. */
@Directive({ selector: "nz-table[adaptZorroTable]" })
class AdaptZorroTableHost {
  constructor() {
    inject(AdaptDesktopTable).attachTableHost(
      inject<ElementRef<HTMLElement>>(ElementRef).nativeElement
    );
  }
}

/**
 * The desktop table body. Layout, rows and part names come from
 * {@link AdaptDesktopStructure}; this kit fills the slots with its own elements.
 *
 * @internal
 */
@Component({
  selector: "adapt-desktop-table",
  imports: [
    AdaptAttrs,
    AdaptColumnHeaderRename,
    AdaptDesktopStructure,
    AdaptHeader,
    AdaptRowActions,
    AdaptSelectionCheckbox,
    AdaptZorroTableHost,
    NgTemplateOutlet,
    NzButtonModule,
    NzTableModule,
  ],
  templateUrl: "./desktopTable.html",
  styleUrl: "./desktopTable.css",
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
})
export class AdaptDesktopTable<TRow> extends AdaptTableSurface<TRow> {
  private kitHost: HTMLElement | null = null;

  /** NG-ZORRO's host is stamped inside the shared structure, so the kit hears about it from the element itself. */
  attachTableHost(element: HTMLElement): void {
    this.kitHost = element;
  }

  protected readonly tableAttrs = computed((): Attrs => ({
    ...(this.view().grid?.tableAttrs() ?? this.view().table.tableAttrs()),
    "data-adapttable-part": "table",
  }));

  /**
   * NG-ZORRO's host names the composite grid for styling; its single generated
   * table owns all roles, refs and keyboard props. React AntD instead needs a
   * semantic wrapper because its sticky header splits into sibling tables.
   */
  protected readonly tableElement = (): HTMLTableElement | null =>
    this.kitHost?.querySelector("table") ?? null;

  /**
   * The scroll box style. The structure owns this when it draws the box;
   * this kit draws the box itself so NG-ZORRO can contain the rows.
   */
  protected scrollStyle(): Record<string, string> | null {
    return scrollBoxStyle(
      this.maxHeight(),
      this.view().table.tableAttrs().style
    );
  }

  /** NG-ZORRO's row class, kept when the row also carries its own class. */
  protected withRowClass(attrs: Attrs): Attrs {
    const own = attrs.class;
    const names = new Set([
      "ant-table-row",
      ...(typeof own === "string" ? own.split(/\s+/).filter(Boolean) : []),
    ]);
    return { ...attrs, class: [...names].join(" ") };
  }
}
