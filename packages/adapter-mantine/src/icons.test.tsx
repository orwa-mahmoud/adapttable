import {
  DELETE_ROW_ACTION_KEY,
  DUPLICATE_ROW_ACTION_KEY,
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  UNPIN_ROW_ACTION_KEY,
} from "@adapttable/core";
import { render } from "@testing-library/react";
import type { CSSProperties, ReactNode } from "react";
import { describe, expect, it } from "vitest";

import {
  AlertIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CloseIcon,
  DeleteRowIcon,
  DuplicateRowIcon,
  FiltersIcon,
  iconForRowAction,
  InboxIcon,
  MoreVerticalIcon,
  PinBottomIcon,
  PinTopIcon,
  RefreshIcon,
  SearchIcon,
  SelectorIcon,
  UnpinRowIcon,
} from "./icons";

/** Every glyph this adapter exports, so none is added without a check. */
const GLYPHS: readonly [
  string,
  (p: {
    size?: number;
    className?: string;
    style?: CSSProperties;
  }) => ReactNode,
][] = [
  ["SearchIcon", SearchIcon],
  ["ChevronUpIcon", ChevronUpIcon],
  ["ChevronDownIcon", ChevronDownIcon],
  ["ChevronRightIcon", ChevronRightIcon],
  ["SelectorIcon", SelectorIcon],
  ["CloseIcon", CloseIcon],
  ["FiltersIcon", FiltersIcon],
  ["AlertIcon", AlertIcon],
  ["RefreshIcon", RefreshIcon],
  ["InboxIcon", InboxIcon],
  ["DuplicateRowIcon", DuplicateRowIcon],
  ["DeleteRowIcon", DeleteRowIcon],
  ["PinTopIcon", PinTopIcon],
  ["PinBottomIcon", PinBottomIcon],
  ["UnpinRowIcon", UnpinRowIcon],
  ["MoreVerticalIcon", MoreVerticalIcon],
];

describe("icons", () => {
  it("honors an explicit size on every glyph", () => {
    for (const [name, Icon] of GLYPHS) {
      const { container } = render(<Icon size={40} />);
      const svg = container.querySelector("svg");

      expect(svg, name).toHaveAttribute("width", "40");
      expect(svg, name).toHaveAttribute("height", "40");
    }
  });

  it("falls back to the 16px default on every glyph", () => {
    for (const [name, Icon] of GLYPHS) {
      const { container } = render(<Icon />);
      const svg = container.querySelector("svg");

      expect(svg, name).toHaveAttribute("width", "16");
      expect(svg, name).toHaveAttribute("height", "16");
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

  it("passes a caller's class and style through to every glyph", () => {
    for (const [name, Icon] of GLYPHS) {
      const { container } = render(
        <Icon className="icon-cls" style={{ color: "red" }} />
      );
      const svg = container.querySelector("svg");

      expect(svg, name).toHaveClass("icon-cls");
      expect(svg, name).toHaveStyle({ color: "rgb(255, 0, 0)" });
    }
  });

  it("keeps a host icon and maps built-in keys to this kit's glyphs", () => {
    const host = <span data-testid="host" />;
    expect(iconForRowAction({ key: "edit", icon: host })).toBe(host);
    expect(iconForRowAction({ key: "edit" })).toBeUndefined();
    const keys = [
      DUPLICATE_ROW_ACTION_KEY,
      DELETE_ROW_ACTION_KEY,
      PIN_TOP_ACTION_KEY,
      PIN_BOTTOM_ACTION_KEY,
      UNPIN_ROW_ACTION_KEY,
    ];
    for (const key of keys) {
      const { container } = render(<>{iconForRowAction({ key })}</>);
      expect(container.querySelector("svg")).not.toBeNull();
    }
  });
});
