/** Complete semantic attribute forwarding for Vue's actual DOM target. */
import { type ComponentPublicInstance, mergeProps, type VNodeProps } from "vue";
export type Attrs = Readonly<Record<string, unknown>>;
export type ElementRef<TElement extends Element = HTMLElement> = (
  element: TElement | null
) => void;
const eventNames: Readonly<Record<string, string>> = {
  onKeyDown: "onKeydown",
  onKeyUp: "onKeyup",
  onKeyPress: "onKeypress",
  onDoubleClick: "onDblclick",
  onPointerDown: "onPointerdown",
  onPointerUp: "onPointerup",
  onPointerMove: "onPointermove",
  onPointerEnter: "onPointerenter",
  onPointerLeave: "onPointerleave",
  onMouseDown: "onMousedown",
  onMouseUp: "onMouseup",
  onMouseMove: "onMousemove",
  onMouseEnter: "onMouseenter",
  onMouseLeave: "onMouseleave",
  onDragStart: "onDragstart",
  onDragEnd: "onDragend",
  onDragOver: "onDragover",
  onDragEnter: "onDragenter",
  onDragLeave: "onDragleave",
  onTouchStart: "onTouchstart",
  onTouchEnd: "onTouchend",
  onFocusCapture: "onFocusCapture",
};
/** Core style numbers use pixels except dimensionless CSS properties. */
const unitlessStyle = new Set([
  "animationIterationCount",
  "aspectRatio",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "columnCount",
  "columns",
  "fillOpacity",
  "flex",
  "flexGrow",
  "flexShrink",
  "floodOpacity",
  "fontWeight",
  "gridArea",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnStart",
  "gridRow",
  "gridRowEnd",
  "gridRowStart",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "stopOpacity",
  "strokeDasharray",
  "strokeDashoffset",
  "strokeMiterlimit",
  "strokeOpacity",
  "strokeWidth",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
]);
export function toVueStyle(style: unknown): unknown {
  if (Array.isArray(style)) return style.map(toVueStyle);
  if (!style || typeof style !== "object") return style;
  return Object.fromEntries(
    Object.entries(style).map(([key, value]) => {
      const unprefixed = key.replace(
        /^(Webkit|Moz|ms|O)([A-Z])/,
        (_all, _prefix: string, first: string) => first.toLowerCase()
      );
      const needsPixels =
        typeof value === "number" &&
        value !== 0 &&
        !key.startsWith("--") &&
        !unitlessStyle.has(unprefixed);
      return [key, needsPixels ? `${String(value)}px` : value];
    })
  );
}
/** Neutral onChange means input for text, change for checkboxes and selects. */
export function toVueAttrs(
  attrs: Attrs,
  options: { readonly changeEvent?: "input" | "change" } = {}
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  const defaultChange =
    attrs.type === "checkbox" || attrs.type === "radio" ? "change" : "input";
  const change = options.changeEvent ?? defaultChange;
  const aliases: Readonly<Record<string, string>> = {
    className: "class",
    htmlFor: "for",
  };
  for (const [key, value] of Object.entries(attrs)) {
    let name = aliases[key] ?? eventNames[key] ?? key;
    if (key === "onChange" && change === "input") name = "onInput";
    const converted = name === "style" ? toVueStyle(value) : value;
    if (name in output && name.startsWith("on"))
      output[name] = [output[name], converted];
    else output[name] = converted;
  }
  return output;
}
/** Binding listeners run first; Vue deduplicates the same listener identity. */
export function mergeVueAttrs(
  binding: Attrs,
  host: Attrs
): Record<string, unknown> {
  return mergeProps(toVueAttrs(binding), toVueAttrs(host));
}
/** A component wrapper must explicitly expose its actual semantic target. */
export function elementRef<TElement extends Element>(
  set: ElementRef<TElement>,
  target?: (component: ComponentPublicInstance) => TElement | null
): VNodeProps["ref"] {
  return (value: Element | ComponentPublicInstance | null) => {
    if (value === null) {
      set(null);
      return;
    }
    if ("$" in value) {
      if (!target)
        throw new Error(
          "AdaptTable: a component ref requires an explicit DOM target resolver."
        );
      set(target(value));
    } else set(value as TElement);
  };
}
/** Calls both refs, releasing the previous DOM target before replacement. */
export function composeElementRefs<TElement extends Element>(
  ...refs: readonly ElementRef<TElement>[]
): ElementRef<TElement> {
  let current: TElement | null = null;
  return (element) => {
    if (element === current) return;
    if (current !== null) for (const ref of refs) ref(null);
    current = element;
    if (element !== null) for (const ref of refs) ref(element);
  };
}
