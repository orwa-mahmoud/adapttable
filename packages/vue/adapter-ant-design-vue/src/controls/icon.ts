import { h, type VNode } from "vue";

/**
 * Ant Design Vue's own `anticon` wrapper around a decorative inline SVG, so the
 * glyph takes the kit's icon sizing and `currentColor` without a second icon
 * package in the adapter's dependencies.
 */
export function antdIcon(
  attrs: Readonly<Record<string, unknown>>,
  glyph: VNode
): ReturnType<typeof h> {
  const { class: className, ...rest } = attrs;
  return h("span", { ...rest, class: ["anticon", className] }, glyph);
}
