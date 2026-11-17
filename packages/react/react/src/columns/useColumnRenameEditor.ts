import { createColumnRenameEditor } from "@adapttable/core/binding";
import {
  type KeyboardEvent,
  useCallback,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { restoreFocusSoon } from "../overlays/restoreFocus";

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
  // The editor is mutable and must see every render's name and messages.
  "use no memo";
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const options = { key, name, onRename, requiredMessage, renamedMessage };
  const [editor] = useState(() => createColumnRenameEditor(options));
  editor.configure(options);
  const { editing, draft, error, announcement } = useSyncExternalStore(
    editor.subscribe,
    editor.getSnapshot,
    editor.getSnapshot
  );
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
    editor.begin();
  }, [editor]);

  const restoreFocus = useCallback(() => {
    cancelRestore.current = restoreFocusSoon(returnFocus.current);
  }, []);

  const cancel = useCallback(() => {
    editor.cancel();
    restoreFocus();
  }, [editor, restoreFocus]);

  const submit = useCallback(() => {
    const outcome = editor.submit();
    if (outcome !== "invalid") restoreFocus();
    return outcome === "renamed";
  }, [editor, restoreFocus]);

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
    setDraft: editor.setDraft,
    blur: editor.blur,
    submit,
    cancel,
    onKeyDown,
  };
}
