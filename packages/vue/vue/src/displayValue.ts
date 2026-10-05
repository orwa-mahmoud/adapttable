import { columnPathText } from "@adapttable/core/binding";
import { isVNode, type VNodeChild } from "vue";

/** Framework display values retain nodes, booleans and nested child arrays. */
export function renderDisplayValue(value: unknown): VNodeChild {
  let content: VNodeChild;
  if (typeof value === "boolean" || isVNode(value)) content = value;
  else if (Array.isArray(value)) content = value.map(renderDisplayValue);
  else content = columnPathText(value);
  return content;
}
