const pendingRoots = /* @__PURE__ */ new WeakSet<Element>();

const EDITOR = '[data-adapttable-part="edit-cell-editor"]';
const ROOT = '[data-adapttable-part="root"]';
const INPUTS =
  'input:not([type="hidden"]), textarea, select, button, [tabindex]';

/**
 * Capture the active editor before a responsive layout replaces its DOM.
 * Restore the corresponding native control and caret after paint, only when
 * the old control was removed and the reader has not focused outside the table.
 * Editing installs it to run on each `notifyLayoutChange()`; a binding
 * can also call it directly before a DOM replacement of its own.
 * @public
 */
export function preserveEditorFocusOnLayoutChange(): void {
  if (typeof document === "undefined") return;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  const editor = active.closest(EDITOR);
  const root = active.closest(ROOT);
  if (!editor || !root || pendingRoots.has(root)) return;
  const view = active.ownerDocument.defaultView;
  if (typeof view?.requestAnimationFrame !== "function") return;
  pendingRoots.add(root);
  const editors = [...root.querySelectorAll(EDITOR)];
  const index = editors.indexOf(editor);
  const controlIndex =
    editor === active
      ? -1
      : [...editor.querySelectorAll(INPUTS)].indexOf(active);
  const start =
    active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
      ? active.selectionStart
      : null;
  const end =
    active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement
      ? active.selectionEnd
      : null;
  view.requestAnimationFrame(() =>
    view.requestAnimationFrame(() => {
      pendingRoots.delete(root);
      if (active.isConnected || !root.isConnected) return;
      const focused = active.ownerDocument.activeElement;
      if (
        focused &&
        focused !== active.ownerDocument.body &&
        !root.contains(focused)
      )
        return;
      const replacements = root.querySelectorAll(EDITOR);
      // Hidden/removed columns change the inventory: do not guess another field.
      if (replacements.length !== editors.length) return;
      const next = replacements[index];
      const target =
        controlIndex === -1
          ? next
          : next?.querySelectorAll(INPUTS)[controlIndex];
      if (!(target instanceof HTMLElement)) return;
      target.focus({ preventScroll: true });
      if (
        start !== null &&
        end !== null &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement) &&
        target.selectionStart !== null
      )
        target.setSelectionRange(start, end);
    })
  );
}
