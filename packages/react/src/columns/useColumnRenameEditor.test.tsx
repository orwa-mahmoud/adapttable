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

/**
 * Reopening the editor while the previous close is still handing focus back.
 *
 * The restore runs a frame late, so a reader who cancels and immediately
 * reopens is typing into an input that a queued frame is about to abandon.
 * If that frame still runs, focus leaves mid-word, the draft keeps the old
 * name, and Enter commits it as if nothing was typed — a rename that
 * silently does nothing.
 */
describe("reopening before focus has been handed back", () => {
  it("cancels the pending focus restore", () => {
    const cancel = vi.spyOn(globalThis, "cancelAnimationFrame");
    const { result } = setup();

    act(() => {
      result.current.begin();
    });
    act(() => {
      result.current.cancel();
    });
    expect(cancel).not.toHaveBeenCalled();

    act(() => {
      result.current.begin();
    });

    // The frame queued by the close above must never reach the input.
    expect(cancel).toHaveBeenCalledTimes(1);
    cancel.mockRestore();
  });

  it("commits what was typed after an immediate reopen", () => {
    const { result, onRename } = setup();

    act(() => {
      result.current.begin();
    });
    act(() => {
      result.current.cancel();
    });
    act(() => {
      result.current.begin();
    });
    act(() => {
      result.current.setDraft("Account owner");
    });

    expect(result.current.draft).toBe("Account owner");
    act(() => {
      result.current.submit();
    });
    expect(onRename).toHaveBeenCalledWith("person", "Account owner");
  });
});
