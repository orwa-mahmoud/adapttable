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

/**
 * Restoration has to tell two things apart that look identical one frame
 * later: a kit's focus scope parking focus on its overlay root because the
 * input vanished, and a reader deliberately moving to another control.
 * Correcting the first is the whole point; overriding the second would take
 * focus away from wherever they just went.
 */
describe("what restoration will and will not reclaim", () => {
  function scene() {
    const shell = document.createElement("div");
    const trigger = document.createElement("button");
    const elsewhere = document.createElement("button");
    shell.tabIndex = -1;
    shell.append(trigger);
    document.body.append(shell, elsewhere);
    return { shell, trigger, elsewhere };
  }

  function editorFor(trigger: HTMLElement) {
    trigger.focus();
    const { result } = renderHook(() =>
      useColumnRenameEditor({
        key: "person",
        name: "Person",
        onRename: vi.fn(),
        requiredMessage: "Enter a column name.",
        renamedMessage: ({ name }) => `renamed to ${name}`,
      })
    );
    act(() => {
      result.current.begin();
    });
    return result;
  }

  const frames = async () => {
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await new Promise((resolve) =>
          requestAnimationFrame(() => resolve(null))
        );
      });
    }
  };

  it("reclaims focus a kit parked on the overlay root", async () => {
    const { shell, trigger } = scene();
    const result = editorFor(trigger);
    act(() => {
      result.current.cancel();
    });
    // What a focus scope does when the thing it was holding disappears.
    shell.focus();

    await frames();

    expect(document.activeElement).toBe(trigger);
    shell.remove();
  });

  it("leaves focus where the reader deliberately put it", async () => {
    const { shell, trigger, elsewhere } = scene();
    const result = editorFor(trigger);
    act(() => {
      result.current.cancel();
    });

    // Cancelling restores to the trigger — that much is the point. What must
    // not happen is the correction frame afterwards dragging focus back from
    // wherever the reader went next.
    await act(async () => {
      await new Promise((resolve) =>
        requestAnimationFrame(() => resolve(null))
      );
    });
    expect(document.activeElement).toBe(trigger);

    // A Tab, a click — a control that is not holding the trigger.
    elsewhere.focus();
    await frames();

    expect(document.activeElement).toBe(elsewhere);
    shell.remove();
    elsewhere.remove();
  });

  it("does not focus a trigger the kit has already removed", async () => {
    const { shell, trigger } = scene();
    const result = editorFor(trigger);
    act(() => {
      result.current.cancel();
    });
    trigger.remove();

    await frames();

    // Nothing to focus, and nothing thrown on the way to finding that out.
    expect(document.activeElement).not.toBe(trigger);
    shell.remove();
  });
});
