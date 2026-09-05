/**
 * The find bar.
 *
 * A search box the reader just asked for, plus the four controls around it. What
 * these cover is the wiring — every control reaching the find state it belongs
 * to, and the keyboard that walks matches and closes without leaving the box.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { findBarTestSlots } from "../internal/chromeTestSlots";
import { FindBarChrome } from "./FindBar";
import type { FindInTableState } from "./useFindInTable";

/** A find state with everything stubbed, overridable per test. */
const stateFor = (over: Partial<FindInTableState> = {}): FindInTableState => ({
  open: true,
  setOpen: vi.fn(),
  query: "",
  setQuery: vi.fn(),
  matches: [],
  index: 0,
  next: vi.fn(),
  previous: vi.fn(),
  matchKeys: new Set<string>(),
  current: null,
  ...over,
});

const part = (name: string) =>
  document.querySelector<HTMLElement>(`[data-adapttable-part="${name}"]`);

describe("FindBar", () => {
  it("renders nothing while the bar is closed", () => {
    const { container } = render(
      <FindBarChrome
        slots={findBarTestSlots}
        find={stateFor({ open: false })}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("focuses the box the reader just opened", () => {
    render(<FindBarChrome slots={findBarTestSlots} find={stateFor()} />);
    expect(part("find-input")).toHaveFocus();
  });

  it("reports what the reader types", () => {
    const find = stateFor();
    render(<FindBarChrome slots={findBarTestSlots} find={find} />);
    fireEvent.change(part("find-input")!, { target: { value: "ada" } });
    expect(find.setQuery).toHaveBeenCalledExactlyOnceWith("ada");
  });

  it("walks matches with Enter, and back with Shift+Enter", () => {
    const find = stateFor({ query: "a", matches: [{}, {}] as never });
    render(<FindBarChrome slots={findBarTestSlots} find={find} />);
    fireEvent.keyDown(part("find-input")!, { key: "Enter" });
    expect(find.next).toHaveBeenCalledOnce();
    fireEvent.keyDown(part("find-input")!, { key: "Enter", shiftKey: true });
    expect(find.previous).toHaveBeenCalledOnce();
  });

  it("closes on Escape, without leaving the box", () => {
    const find = stateFor();
    render(<FindBarChrome slots={findBarTestSlots} find={find} />);
    fireEvent.keyDown(part("find-input")!, { key: "Escape" });
    expect(find.setOpen).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("leaves other keys to the input", () => {
    const find = stateFor();
    render(<FindBarChrome slots={findBarTestSlots} find={find} />);
    fireEvent.keyDown(part("find-input")!, { key: "a" });
    expect(find.next).not.toHaveBeenCalled();
    expect(find.previous).not.toHaveBeenCalled();
    expect(find.setOpen).not.toHaveBeenCalled();
  });

  it("announces the count in a live region", () => {
    render(
      <FindBarChrome
        slots={findBarTestSlots}
        find={stateFor({ index: 2, matches: Array(12).fill({}) })}
      />
    );
    const count = part("find-count")!;
    expect(count.tagName).toBe("OUTPUT");
    // 1-based for the reader: the third match of twelve.
    expect(count).toHaveTextContent("3 of 12");
  });

  it("disables the walk controls until something matches", () => {
    render(<FindBarChrome slots={findBarTestSlots} find={stateFor()} />);
    expect(part("find-previous")).toBeDisabled();
    expect(part("find-next")).toBeDisabled();
  });

  it("walks and closes from its own controls", () => {
    const find = stateFor({ query: "a", matches: [{}, {}] as never });
    render(<FindBarChrome slots={findBarTestSlots} find={find} />);
    fireEvent.click(part("find-next")!);
    expect(find.next).toHaveBeenCalledOnce();
    fireEvent.click(part("find-previous")!);
    expect(find.previous).toHaveBeenCalledOnce();
    fireEvent.click(part("find-close")!);
    expect(find.setOpen).toHaveBeenCalledExactlyOnceWith(false);
  });

  it("takes localized names, and the host's own count wording", () => {
    render(
      <FindBarChrome
        slots={findBarTestSlots}
        find={stateFor({ matches: [{}] as never })}
        labels={{
          findInTable: "ابحث في الجدول",
          findPlaceholder: "ابحث…",
          findNext: "التالي",
          findPrevious: "السابق",
          findClose: "إغلاق",
          findMatchCount: (current, total) =>
            `${String(current)} من ${String(total)}`,
        }}
      />
    );
    expect(screen.getByLabelText("ابحث في الجدول")).toHaveAttribute(
      "placeholder",
      "ابحث…"
    );
    expect(screen.getByLabelText("التالي")).not.toBeNull();
    expect(screen.getByLabelText("السابق")).not.toBeNull();
    expect(screen.getByLabelText("إغلاق")).not.toBeNull();
    expect(part("find-count")).toHaveTextContent("1 من 1");
  });

  it("takes a kit's own class for the bar", () => {
    render(
      <FindBarChrome
        slots={findBarTestSlots}
        find={stateFor()}
        className="cn-find"
      />
    );
    expect(part("find-bar")).toHaveClass("cn-find");
  });
});
