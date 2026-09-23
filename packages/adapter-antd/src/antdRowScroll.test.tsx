import type { KeyedWindow } from "@adapttable/react/adapter";
import { render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type AntdTableRef,
  KeyedScrollRegistration,
  scrollAntdRow,
  useAntdRowScroll,
} from "./antdRowScroll";

/** antd's table handle, holding the rows its window rendered. */
function tableWith(renderedKeys: readonly string[]) {
  const nativeElement = document.createElement("div");
  for (const key of renderedKeys) {
    const row = document.createElement("tr");
    row.dataset.rowKey = key;
    nativeElement.append(row);
  }
  const scrollTo = vi.fn();
  return { handle: { nativeElement, scrollTo } as AntdTableRef, scrollTo };
}

describe("find's row scroll in antd", () => {
  it("scrolls antd's virtual table to a row outside its window, by key", () => {
    const { result } = renderHook(() => useAntdRowScroll());
    const { handle, scrollTo } = tableWith(["1", "2", "3"]);
    result.current.table.current = handle;

    scrollAntdRow(result.current, "900");

    expect(scrollTo).toHaveBeenCalledWith({ key: "900" });
  });

  it("leaves a row the table already rendered where it is", () => {
    const { result } = renderHook(() => useAntdRowScroll());
    const { handle, scrollTo } = tableWith(["1", "2", "3"]);
    result.current.table.current = handle;

    scrollAntdRow(result.current, "2");

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("scrolls a live keyed window instead of the table", () => {
    const { result } = renderHook(() => useAntdRowScroll());
    const { handle, scrollTo } = tableWith([]);
    result.current.table.current = handle;
    const scrollToIndex = vi.fn();
    const keyed: KeyedWindow = {
      enabled: true,
      indices: [0, 1],
      paddingTop: 0,
      paddingBottom: 0,
      scrollToIndex,
    };
    render(
      <KeyedScrollRegistration
        target={result.current.cards}
        keys={["a", "b", "c", "d"]}
        keyed={keyed}
      />
    );

    scrollAntdRow(result.current, "d");
    expect(scrollToIndex).toHaveBeenCalledWith(3);
    scrollAntdRow(result.current, "b");
    expect(scrollToIndex).toHaveBeenCalledTimes(1);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("holds no keyed scroll while the window is off, or after it unmounts", () => {
    const { result } = renderHook(() => useAntdRowScroll());
    const keyed: KeyedWindow = {
      enabled: false,
      indices: [0, 1, 2],
      paddingTop: 0,
      paddingBottom: 0,
      scrollToIndex: vi.fn(),
    };
    const view = render(
      <KeyedScrollRegistration
        target={result.current.groups}
        keys={["a", "b", "c"]}
        keyed={keyed}
      />
    );
    expect(result.current.groups.current).toBeNull();

    view.rerender(
      <KeyedScrollRegistration
        target={result.current.groups}
        keys={["a", "b", "c"]}
        keyed={{ ...keyed, enabled: true }}
      />
    );
    expect(result.current.groups.current).not.toBeNull();

    view.unmount();
    expect(result.current.groups.current).toBeNull();
  });
});
