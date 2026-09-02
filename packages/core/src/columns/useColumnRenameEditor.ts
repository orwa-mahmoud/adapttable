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

function restoreFocus(element: HTMLElement | null): void {
  if (!element) return;
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => element.focus());
  } else {
    setTimeout(() => element.focus(), 0);
  }
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
  const [draft, setDraftState] = useState(name);
  const [error, setError] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const returnFocus = useRef<HTMLElement | null>(null);

  const begin = useCallback(() => {
    returnFocus.current =
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDraftState(name);
    setError(undefined);
    setEditing(true);
  }, [name]);

  const setDraft = useCallback((value: string) => {
    setDraftState(value);
    if (value.trim() !== "") setError(undefined);
  }, []);

  const blur = useCallback(() => {
    if (draft.trim() === "") setError(requiredMessage);
  }, [draft, requiredMessage]);

  const close = useCallback(() => {
    setEditing(false);
    setError(undefined);
    restoreFocus(returnFocus.current);
  }, []);

  const cancel = useCallback(() => {
    setDraftState(name);
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
    setDraft,
    blur,
    submit,
    cancel,
    onKeyDown,
  };
}
