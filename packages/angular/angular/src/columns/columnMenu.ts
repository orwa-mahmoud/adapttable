/**
 * What a kit's Columns menu needs beside its controls: dragging a column
 * row to reorder it, the keyboard grip that does the same, and the inline
 * rename editor — each over core's controller, as signals and attributes.
 */
import {
  columnReorderKeyDown,
  createColumnDragController,
  createColumnRenameEditor,
  isRtlElement,
  restoreFocusSoon,
} from "@adapttable/core";
import {
  assertInInjectionContext,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  type Signal,
} from "@angular/core";

import type { Attrs } from "../attrs";
import { fromStore } from "../store";

/**
 * Drag-to-reorder for a column menu's rows.
 *
 * @public
 */
export interface ColumnDrag {
  /**
   * A row's attributes: the whole row is the drag source and a drop target,
   * and it carries `data-dragging` while dragged and `data-drop="before"` or
   * `"after"` while a column hovers it.
   */
  readonly rowAttrs: (
    key: string,
    index: number,
    move: (key: string, toIndex: number) => void
  ) => Attrs;
  /**
   * The reorder grip's attributes: a focusable button that moves the column
   * with the arrow keys, following the writing direction.
   */
  readonly gripAttrs: (
    key: string,
    index: number,
    move: (key: string, toIndex: number) => void,
    label: string
  ) => Attrs;
}

/**
 * Drag-to-reorder state for one column menu.
 *
 * @param injector - The injector to run in. Omit inside an injection context.
 * @returns The row and grip attributes.
 *
 * @public
 */
export function injectColumnDrag(injector?: Injector): ColumnDrag {
  if (!injector) assertInInjectionContext(injectColumnDrag);
  const context = injector ?? inject(Injector);
  const controller = createColumnDragController();
  const snapshot = fromStore(controller, { injector: context });
  return {
    rowAttrs: (key, index, move) => {
      snapshot();
      return {
        draggable: "true",
        onDragStart: (event: DragEvent) => {
          controller.dragStart(event, key, index);
        },
        onDragOver: (event: DragEvent) => {
          controller.dragOver(event, index);
        },
        onDrop: (event: DragEvent) => {
          controller.drop(event, index, move);
        },
        onDragEnd: controller.end,
        ...controller.rowAttrs(key, index),
      };
    },
    gripAttrs: (key, index, move, label) => ({
      role: "button",
      tabIndex: 0,
      "aria-label": label,
      "data-adapttable-grip": "",
      onKeyDown: (event: KeyboardEvent) => {
        columnReorderKeyDown(event, key, index, move, (element) =>
          isRtlElement(element as HTMLElement | null)
        );
      },
    }),
  };
}

/**
 * Options for {@link injectColumnRenameEditor}.
 *
 * @public
 */
export interface ColumnRenameEditorOptions {
  /** The column, its current name, the rename and the messages. */
  readonly column: Signal<{
    readonly key: string;
    readonly name: string;
    readonly onRename: (key: string, name: string) => void;
    readonly requiredMessage: string;
    readonly renamedMessage: (info: {
      previous: string;
      name: string;
    }) => string;
  }>;
  /** The injector to run in. Omit inside an injection context. */
  readonly injector?: Injector;
}

/**
 * An inline column-name editor.
 *
 * @public
 */
export interface ColumnRenameEditorState {
  /** Whether the editor is open. */
  readonly editing: Signal<boolean>;
  /** Why the draft cannot be saved, if it cannot. */
  readonly error: Signal<string | undefined>;
  /** What to announce after a rename. */
  readonly announcement: Signal<string>;
  /** The input's id, for its `<label for>`. */
  readonly inputId: string;
  /** The error's id, which the input names when there is one. */
  readonly errorId: string;
  /** Open the editor on the current name. */
  readonly begin: () => void;
  /** Save the draft. `true` when the column was renamed. */
  readonly submit: () => boolean;
  /** Close the editor and hand focus back. */
  readonly cancel: () => void;
  /**
   * The input's attributes: its id and value, its error, the draft on every
   * keystroke, the check on blur, Escape to cancel, and focus once shown.
   */
  readonly inputAttrs: () => Attrs;
}

let nextEditorId = 0;

/**
 * An inline editor for one column's name, over core's rename editor.
 *
 * @param options - See {@link ColumnRenameEditorOptions}.
 * @returns The editor; see {@link ColumnRenameEditorState}.
 *
 * @public
 */
export function injectColumnRenameEditor(
  options: ColumnRenameEditorOptions
): ColumnRenameEditorState {
  if (!options.injector) assertInInjectionContext(injectColumnRenameEditor);
  const injector = options.injector ?? inject(Injector);
  nextEditorId += 1;
  const inputId = `adapttable-rename-${String(nextEditorId)}`;
  // The column arrives through a component's inputs, which are not set yet
  // while the component is being built; the effect below configures the
  // editor before anything can open it.
  const editor = createColumnRenameEditor({
    key: "",
    name: "",
    onRename: () => undefined,
    requiredMessage: "",
    renamedMessage: () => "",
  });
  effect(
    () => {
      editor.configure(options.column());
    },
    { injector }
  );
  const snapshot = fromStore(editor, { injector });
  let returnFocus: HTMLElement | null = null;
  let cancelRestore: () => void = () => undefined;
  const restoreFocus = (): void => {
    cancelRestore();
    cancelRestore = restoreFocusSoon(returnFocus);
  };
  injector.get(DestroyRef).onDestroy(() => {
    cancelRestore();
    returnFocus = null;
  });
  const cancel = (): void => {
    editor.cancel();
    restoreFocus();
  };

  return {
    editing: computed(() => snapshot().editing),
    error: computed(() => snapshot().error),
    announcement: computed(() => snapshot().announcement),
    inputId,
    errorId: `${inputId}-error`,
    begin: () => {
      // Reopening beats a close that has not finished handing focus back,
      // or the reader's next keystrokes land on the trigger.
      cancelRestore();
      returnFocus =
        typeof document !== "undefined" &&
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      editor.begin();
    },
    submit: () => {
      const outcome = editor.submit();
      if (outcome !== "invalid") restoreFocus();
      return outcome === "renamed";
    },
    cancel,
    inputAttrs: () => {
      const { draft, error } = snapshot();
      return {
        id: inputId,
        value: draft,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": error ? `${inputId}-error` : undefined,
        onChange: (event: Event) => {
          editor.setDraft((event.target as HTMLInputElement).value);
        },
        onBlur: editor.blur,
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          cancel();
        },
        ref: (element: HTMLElement | null) => {
          element?.focus();
        },
      };
    },
  };
}
