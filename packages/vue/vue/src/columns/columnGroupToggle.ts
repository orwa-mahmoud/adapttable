/** The binding chooses labels/state; the adapter supplies the visible button. */
import type {
  ColumnGroupToggleProps,
  ColumnGroupToggleSlots as NeutralColumnGroupToggleSlots,
} from "@adapttable/core/binding";
import { Fragment, h, type VNode, type VNodeChild } from "vue";
export type {
  ColumnGroupToggleButtonProps,
  ColumnGroupToggleProps,
} from "@adapttable/core/binding";
export type ColumnGroupToggleSlots = NeutralColumnGroupToggleSlots<VNodeChild>;
export interface ColumnGroupToggleChromeProps extends ColumnGroupToggleProps {
  readonly slots: ColumnGroupToggleSlots;
}
export function ColumnGroupToggleChrome(
  props: ColumnGroupToggleChromeProps
): VNode {
  const { cell, labels, slots } = props;
  const id = cell.id;
  if (!cell.collapsible || id === null) return h(Fragment);
  if (!slots.Button)
    throw new Error(
      'AdaptTable: required adapter control slot "ColumnGroupToggle.Button" is missing.'
    );
  const action = cell.collapsed
    ? labels.expandColumnGroup
    : labels.collapseColumnGroup;
  return h(Fragment, null, [
    slots.Button({
      label: cell.label ? `${action}: ${cell.label}` : action,
      expanded: !cell.collapsed,
      className: props.className,
      onClick: () => props.onToggle(id),
    }),
  ]);
}
ColumnGroupToggleChrome.props = [
  "cell",
  "labels",
  "onToggle",
  "className",
  "slots",
];
