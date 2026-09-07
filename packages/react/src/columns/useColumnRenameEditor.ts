import {
  type KeyboardEvent,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";

/**
 * Options for the kit-owned inline column-name editor.
 *
 * @public
 */
export interface UseColumnRenameEditorOptions {
  /** Stable column key. */
  key: string;
  /** Current display name. */
  name: string;
  /** Commit channel supplied by the table. */
  onRename: (key: string, name: string) => void;
  /** Localized validation message for a blank name. */
  requiredMessage: string;
  /** Localized polite announcement builder. */
  renamedMessage: (info: { previous: string; name: string }) => string;
}

/**
 * Headless state for an adapter's native column-name controls.
 *
 * @public
 */
export interface ColumnRenameEditorState {
  /** Whether the inline form is visible. */
  editing: boolean;
  /** Controlled input value. */
  draft: string;
  /** Validation message after a blank submit/blur. */
  error?: string;
  /** Stable id for the visible input label. */
  inputId: string;
  /** Stable id for `aria-describedby` when validation fails. */
  errorId: string;
  /** Polite message to render in the adapter's live region. */
  announcement: string;
  /** Open the editor and seed it from the current name. */
  begin: () => void;
  /** Update the draft and clear a corrected required error. */
  setDraft: (value: string) => void;
  /** Validate an input blur. */
  blur: () => void;
  /** Commit a valid trimmed name. Returns whether a change was made. */
  submit: () => boolean;
  /** Cancel, discard the draft and restore focus to the invoking control. */
  cancel: () => void;
  /** Escape-key handler shared by every kit input. */
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Hand focus back to the control that opened the editor, one frame later.
 *
 * The delay is what makes it work at all: the input is still mounted when
 * close runs, and focusing the trigger synchronously fights React's own
 * commit. It is also what makes it dangerous — a reader who reopens the
 * editor before that frame arrives would have focus pulled out of the input
 * they are already typing into, so the caller is handed a way to cancel it.
 *
 * @param element - The control to focus.
 * @returns A cancel function for the pending restore.
 */
/**
 * Whether focus ended up somewhere that means "nobody claimed it".
 *
 * A kit's focus scope reacts to the input unmounting by parking focus on the
 * overlay's own root — a container that still holds the trigger — or letting
 * it fall to the document. Neither is a decision; both are the gap this
 * restores from.
 *
 * Focus sitting on some *other* control is a decision: a Tab, a click, an
 * overlay that opened and took it. Those are left alone, because arguing
 * with them is how a rename editor ends up stealing focus from whatever the
 * reader moved to next.
 */
function focusWasDropped(trigger: HTMLElement): boolean {
  const active = document.activeElement;
  if (active === null || active === document.body) return true;
  // An ancestor of the trigger: a container holding it, not a peer chosen
  // over it.
  return active !== trigger && active.contains(trigger);
}

function restoreFocus(element: HTMLElement | null): () => void {
  if (!element) return () => undefined;
  const frame =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (fn: () => void) => setTimeout(fn, 0) as unknown as number;
  const cancel =
    typeof cancelAnimationFrame === "function"
      ? cancelAnimationFrame
      : (id: number) => {
          clearTimeout(id);
        };

  // Focusing a node the kit has already removed does nothing and silently
  // drops focus to the document, which is worse than not trying.
  const focusIfPresent = (): void => {
    if (element.isConnected) element.focus();
  };

  let second: number | undefined;
  const first = frame(() => {
    focusIfPresent();
    // Some kits move focus to the overlay root a tick after the input
    // unmounts, undoing the line above. One verification frame reclaims it —
    // and only when nothing else has deliberately taken it.
    second = frame(() => {
      if (document.activeElement === element) return;
      if (!focusWasDropped(element)) return;
      focusIfPresent();
    });
  });
  return () => {
    cancel(first);
    if (second !== undefined) cancel(second);
  };
}

/**
 * Keep rename behavior identical while every adapter renders its own native
 * label, input and buttons. Core owns no form markup.
 *
 * @public
 */
export function useColumnRenameEditor({
  key,
  name,
  onRename,
  requiredMessage,
  renamedMessage,
}: UseColumnRenameEditorOptions): ColumnRenameEditorState {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState<string | undefined>(undefined);
  const [announcement, setAnnouncement] = useState("");
  const returnFocus = useRef<HTMLElement | null>(null);
  /** Cancels a focus restore that has not run yet. */
  const cancelRestore = useRef<() => void>(() => undefined);

  const begin = useCallback(() => {
    // Reopening beats a close that has not finished handing focus back.
    // Without this, the queued restore lands after the new input has taken
    // focus and the reader's next keystrokes go to the trigger instead —
    // the draft never changes, and Enter quietly commits the old name.
    cancelRestore.current();
    returnFocus.current =
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDraft(name);
    setError(undefined);
    setEditing(true);
  }, [name]);

  const updateDraft = useCallback((value: string) => {
    setDraft(value);
    if (value.trim() !== "") setError(undefined);
  }, []);

  const blur = useCallback(() => {
    if (draft.trim() === "") setError(requiredMessage);
  }, [draft, requiredMessage]);

  const close = useCallback(() => {
    setEditing(false);
    setError(undefined);
    cancelRestore.current = restoreFocus(returnFocus.current);
  }, []);

  const cancel = useCallback(() => {
    setDraft(name);
    close();
  }, [close, name]);

  const submit = useCallback(() => {
    const next = draft.trim();
    if (next === "") {
      setError(requiredMessage);
      return false;
    }
    if (next === name) {
      close();
      return false;
    }
    onRename(key, next);
    setAnnouncement(renamedMessage({ previous: name, name: next }));
    close();
    return true;
  }, [close, draft, key, name, onRename, renamedMessage, requiredMessage]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
    },
    [cancel]
  );

  return {
    editing,
    draft,
    error,
    inputId,
    errorId,
    announcement,
    begin,
    setDraft: updateDraft,
    blur,
    submit,
    cancel,
    onKeyDown,
  };
}
