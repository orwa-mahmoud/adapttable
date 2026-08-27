import {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  UNPIN_ROW_ACTION_KEY,
} from "@adapttable/core";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import {
  DeleteRowIcon,
  DuplicateRowIcon,
  FiltersIcon,
  iconForRowAction,
  MoreVerticalIcon,
  PinBottomIcon,
  PinTopIcon,
  UnpinRowIcon,
} from "./icons";

const BUILT_IN = [
  DUPLICATE_ROW_ACTION_KEY,
  DELETE_ROW_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  PIN_BOTTOM_ACTION_KEY,
  UNPIN_ROW_ACTION_KEY,
];

const GLYPHS: readonly [string, (p: { size?: number }) => ReactNode][] = [
  ["FiltersIcon", FiltersIcon],
  ["DuplicateRowIcon", DuplicateRowIcon],
  ["DeleteRowIcon", DeleteRowIcon],
  ["PinTopIcon", PinTopIcon],
  ["PinBottomIcon", PinBottomIcon],
  ["UnpinRowIcon", UnpinRowIcon],
  ["MoreVerticalIcon", MoreVerticalIcon],
];

describe("icons", () => {
  it("renders the Filters glyph", () => {
    const { container } = render(<FiltersIcon />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("keeps a host icon and maps built-in keys to this kit's glyphs", () => {
    const host = <span data-testid="host" />;
    expect(iconForRowAction({ key: "edit", icon: host })).toBe(host);
    expect(iconForRowAction({ key: "edit" })).toBeUndefined();
    for (const key of BUILT_IN) {
      const { container } = render(<>{iconForRowAction({ key })}</>);
      expect(container.querySelector("svg")).not.toBeNull();
    }
  });

  it("honors an explicit size on every glyph", () => {
    for (const [name, Icon] of GLYPHS) {
      const { container } = render(<Icon size={20} />);
      const svg = container.querySelector("svg");

      expect(svg, name).toHaveAttribute("width", "20");
      expect(svg, name).toHaveAttribute("height", "20");
    }
  });

  it("falls back to the 15px default on every glyph", () => {
    for (const [name, Icon] of GLYPHS) {
      const { container } = render(<Icon />);
      const svg = container.querySelector("svg");

      expect(svg, name).toHaveAttribute("width", "15");
      expect(svg, name).toHaveAttribute("height", "15");
    }
  });

  it("keeps every glyph out of the accessibility tree", () => {
    for (const [name, Icon] of GLYPHS) {
      const { container } = render(<Icon />);
      const svg = container.querySelector("svg");

      expect(svg, name).toHaveAttribute("aria-hidden", "true");
      expect(svg, name).toHaveAttribute("focusable", "false");
    }
  });
});
