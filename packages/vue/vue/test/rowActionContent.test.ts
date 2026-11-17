/**
 * A row action button's content: the host's icon (vnode, component or
 * glyph) with the label as its accessible name, or the label alone.
 */
import { describe, expect, it } from "vitest";
import { createApp, h, isVNode } from "vue";

import {
  RowActionContent,
  rowActionContent,
  type RowActionControl,
  rowActionIconOnly,
} from "../src/adapter";

const control = (icon?: unknown): RowActionControl<unknown> => ({
  key: "edit",
  label: "Edit",
  action: { key: "edit", label: "Edit", icon: icon as never },
  attrs: { "aria-label": "Edit" },
});

describe("rowActionContent", () => {
  it("is the label when the action has no icon", () => {
    expect(rowActionContent(control())).toBe("Edit");
    expect(rowActionIconOnly(control())).toBe(false);
  });

  it("is the host's vnode or glyph as given", () => {
    const glyph = h("svg");
    expect(rowActionContent(control(glyph))).toBe(glyph);
    expect(rowActionContent(control("✎"))).toBe("✎");
    expect(rowActionIconOnly(control("✎"))).toBe(true);
  });

  it("renders a component icon, hidden from assistive technology", () => {
    const Icon = () => h("svg", { "data-icon": "" });
    const content = rowActionContent(control(Icon));
    expect(isVNode(content)).toBe(true);
    const root = document.createElement("div");
    const app = createApp({
      render: () => h(RowActionContent, { control: control(Icon) }),
    });
    app.mount(root);
    expect(
      root
        .querySelector("svg[data-icon]")
        ?.parentElement?.getAttribute("aria-hidden")
    ).toBe("true");
    app.unmount();
  });
});
