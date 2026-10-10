import {
  columnReorderKeyDown,
  createColumnDragController,
  isRtlElement,
} from "@adapttable/core";
import { assertInInjectionContext, inject, Injector } from "@angular/core";

import type { Attrs } from "../attrContracts";
import { fromStore } from "../store";

/**
 * Drag-to-reorder for a column menu's rows.
 *
 * @public
 */
export interface ColumnDrag {
  /**
   * A row's attributes: the whole row is the drag source and a drop target,
   * and it carries `data-dragging` while dragged and `data-drop="before"` or
   * `"after"` while a column hovers it.
   */
  readonly rowAttrs: (
    key: string,
    index: number,
    move: (key: string, toIndex: number) => void
  ) => Attrs;
  /**
   * The reorder grip's attributes: a focusable button that moves the column
   * with the arrow keys, following the writing direction.
   */
  readonly gripAttrs: (
    key: string,
    index: number,
    move: (key: string, toIndex: number) => void,
    label: string
  ) => Attrs;
}

/**
 * Drag-to-reorder state for one column menu.
 *
 * @param injector - The injector to run in. Omit inside an injection context.
 * @returns The row and grip attributes.
 *
 * @public
 */
export function injectColumnDrag(injector?: Injector): ColumnDrag {
  if (!injector) assertInInjectionContext(injectColumnDrag);
  const context = injector ?? inject(Injector);
  const controller = createColumnDragController();
  const snapshot = fromStore(controller, { injector: context });
  return {
    rowAttrs: (key, index, move) => {
      snapshot();
      return {
        draggable: "true",
        onDragStart: (event: DragEvent) => {
          controller.dragStart(event, key, index);
        },
        onDragOver: (event: DragEvent) => {
          controller.dragOver(event, index);
        },
        onDrop: (event: DragEvent) => {
          controller.drop(event, index, move);
        },
        onDragEnd: controller.end,
        ...controller.rowAttrs(key, index),
      };
    },
    gripAttrs: (key, index, move, label) => ({
      role: "button",
      tabIndex: 0,
      "aria-label": label,
      "data-adapttable-grip": "",
      onKeyDown: (event: KeyboardEvent) => {
        columnReorderKeyDown(event, key, index, move, (element) =>
          isRtlElement(element as HTMLElement | null)
        );
      },
    }),
  };
}
