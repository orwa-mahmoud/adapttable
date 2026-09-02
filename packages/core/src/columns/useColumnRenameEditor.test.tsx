import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useColumnRenameEditor } from "./useColumnRenameEditor";

function setup(name = "Person") {
  const onRename = vi.fn();
  const view = renderHook(() =>
    useColumnRenameEditor({
      key: "person",
      name,
      onRename,
      requiredMessage: "Name required",
      renamedMessage: ({ previous, name: next }) =>
        `${previous} became ${next}`,
    })
  );
  return { onRename, ...view };
}

describe("useColumnRenameEditor", () => {
  it("trims and commits a changed name with an announcement", () => {
    const { result, onRename } = setup();
    act(() => result.current.begin());
    act(() => result.current.setDraft("  Account owner  "));
    act(() => result.current.submit());

    expect(onRename).toHaveBeenCalledWith("person", "Account owner");
    expect(result.current.editing).toBe(false);
    expect(result.current.announcement).toBe("Person became Account owner");
  });

  it("keeps a blank editor open with localized validation", () => {
    const { result, onRename } = setup();
    act(() => result.current.begin());
    act(() => result.current.setDraft(" "));
    act(() => result.current.blur());
    expect(result.current.error).toBe("Name required");

    act(() => result.current.submit());
    expect(result.current.editing).toBe(true);
    expect(onRename).not.toHaveBeenCalled();

    act(() => result.current.setDraft("Owner"));
    expect(result.current.error).toBeUndefined();
  });

  it("cancels on Escape and treats the current name as a no-op", () => {
    const { result, onRename } = setup();
    act(() => result.current.begin());
    act(() =>
      result.current.onKeyDown({
        key: "Escape",
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as never)
    );
    expect(result.current.editing).toBe(false);

    act(() => result.current.begin());
    act(() => result.current.submit());
    expect(onRename).not.toHaveBeenCalled();
  });
});
