import type { IconDescriptor } from "@adapttable/core/binding";
import { h } from "vue";

/** Draw core-owned glyph data; controls remain required kit slots. */
export function assistantIcon(descriptor: IconDescriptor) {
  const { shapes, strokeWidth, strokeLinecap, strokeLinejoin, ...attrs } =
    descriptor;
  return h(
    "svg",
    {
      ...attrs,
      "aria-hidden": "true",
      focusable: "false",
      "stroke-width": strokeWidth,
      "stroke-linecap": strokeLinecap,
      "stroke-linejoin": strokeLinejoin,
    },
    shapes.map(({ tag, ...shape }) =>
      h(
        tag,
        Object.fromEntries(
          Object.entries(shape).map(([key, value]) => [
            key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
            value,
          ])
        )
      )
    )
  );
}
