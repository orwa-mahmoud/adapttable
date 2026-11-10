import { defineComponent, h, type VNode, type VNodeChild } from "vue";

import type { TableRowModel } from "./tableModels";

/**
 * What drawing a row reads besides the row itself. A different object in any
 * of these redraws the row.
 *
 * @public
 */
export interface TableRowViewContext {
  /** The table model the row belongs to. */
  readonly model: object;
  /** The kit's controls. */
  readonly controls?: object;
  /** The class names the row is drawn with. */
  readonly classNames?: object;
}

const TableRowView = defineComponent({
  name: "AdaptTableRow",
  props: {
    row: { type: Object, required: true },
    model: { type: Object, required: true },
    controls: { type: Object, default: undefined },
    classNames: { type: Object, default: undefined },
  },
  setup(_props, { slots }) {
    // One root when the row draws one, so the markup is the row's own.
    return () => {
      const drawn = slots.default?.() ?? [];
      return drawn.length === 1 ? drawn[0] : drawn;
    };
  },
});

/**
 * Draw one body row in a component of its own.
 *
 * The row redraws when its model, the table model, the kit's controls or the
 * class names arrive as a different object, or when state it read while
 * drawing changes, such as its own selection. Another row's change leaves it
 * as it is.
 *
 * `draw` reads the row, the context and reactive state only: until one of
 * those changes, the row keeps what it drew last.
 *
 * @param row - The row to draw; its key keys the component.
 * @param context - What the drawing reads besides the row.
 * @param draw - Draws the row.
 *
 * @public
 */
export function tableRowView<TRow>(
  row: TableRowModel<TRow>,
  context: TableRowViewContext,
  draw: () => VNodeChild
): VNode {
  // A stable slot: the props alone decide when the row redraws.
  return h(
    TableRowView,
    { key: row.key, row, ...context },
    { default: draw, $stable: true }
  );
}

/**
 * The kit's controls as one object while the host slots they carry stay the
 * same, so the rows drawn with them keep their props.
 *
 * Every other control a kit builds reads its state when it is called, so a
 * kept object draws the same as a new one.
 *
 * @param build - Builds the kit's controls.
 * @param hostSlots - The host slots `build` put in them, in a fixed order.
 * @returns Reads the controls: the kept object, or a new one when a host slot
 *   changed.
 *
 * @public
 */
export function keepTableControls<TControls extends object>(
  build: () => TControls,
  hostSlots: (controls: TControls) => readonly unknown[]
): () => TControls {
  let kept: { controls: TControls; slots: readonly unknown[] } | undefined;
  return () => {
    const controls = build();
    const slots = hostSlots(controls);
    if (
      kept?.slots.length === slots.length &&
      kept.slots.every((slot, index) => slot === slots[index])
    )
      return kept.controls;
    kept = { controls, slots };
    return controls;
  };
}
