/**
 * Multi-select cell editor, for kits whose select holds one value.
 *
 * A native `<select multiple>` is the compact answer, and the kits that wrap
 * one — MUI, Ant Design, Mantine, Chakra — use theirs. Radix Themes and Base UI
 * build their select out of a button and a popup, which by construction picks a
 * single item, so those kits express "several of these" as a list of their own
 * checkboxes instead.
 *
 * That list is structure — the group, its accessible name, which option takes
 * focus, when a blur means "done" — so it lives here, and each kit supplies the
 * checkbox. Three adapters rendering three copies of the same `<div role=
 * "group">` is the defect this exists to avoid.
 */
import type { KeyboardEvent, ReactNode } from "react";

import { formatMultiDraft, readMultiDraft } from "./cellEditing";
import {
  type EditableCellEditorCtrl,
  editorValidationProps,
} from "./EditableCellGate";

/**
 * One option's checkbox, rendered by the adapter with its kit's control.
 *
 * @public
 */
export interface MultiSelectEditorCheckboxProps {
  /** The option's visible text. */
  readonly label: ReactNode;
  /** The option's value — unique within the editor. */
  readonly value: string;
  /** Whether the draft currently holds this value. */
  readonly checked: boolean;
  /** Add or remove this value from the draft. */
  readonly onToggle: () => void;
  /**
   * Present on the FIRST option only. Attach it to the kit's control so the
   * editor takes focus when the cell opens, exactly as a single-control editor
   * does through {@link EditableCellEditorCtrl.focusRef}.
   */
  readonly focusRef?: (node: { focus: () => void } | null) => void;
  /**
   * The editor's key handling — Enter commits, Escape cancels. It belongs on
   * the controls themselves rather than the group: a group is not an
   * interactive element, and keys arrive at whichever option has focus.
   */
  readonly onKeyDown: (event: KeyboardEvent) => void;
}

/**
 * Adapter-supplied controls for {@link MultiSelectEditorChrome}.
 *
 * @public
 */
export interface MultiSelectEditorSlots {
  readonly Checkbox: (props: MultiSelectEditorCheckboxProps) => ReactNode;
}

/**
 * Props for {@link MultiSelectEditorChrome}.
 *
 * @public
 */
export interface MultiSelectEditorChromeProps {
  /** The active cell's editor controller. */
  readonly ctrl: EditableCellEditorCtrl;
  /** Accessible name for the group — the table's edit label. */
  readonly label: string;
  /** The adapter's key handling, already wired to `ctrl.onEditorKeyDown`. */
  readonly onKeyDown: (event: KeyboardEvent) => void;
  readonly slots: MultiSelectEditorSlots;
}

/**
 * A group of kit checkboxes standing in for `<select multiple>`.
 *
 * @param props - See {@link MultiSelectEditorChromeProps}.
 * @returns The editor, named and focusable as one control.
 *
 * @public
 */
export function MultiSelectEditorChrome({
  ctrl,
  label,
  onKeyDown,
  slots,
}: Readonly<MultiSelectEditorChromeProps>): ReactNode {
  const selected = readMultiDraft(ctrl.draft);
  const Checkbox = slots.Checkbox;

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    // Written in the editor's own option order, so a round-trip through the
    // draft never reshuffles what the reader ticked.
    ctrl.setDraft(
      formatMultiDraft(
        ctrl.selectOptions
          .map((option) => option.value)
          .filter((option) => next.includes(option))
      )
    );
  };

  return (
    <div
      role="group"
      aria-label={label}
      data-adapttable-part="edit-cell-editor"
      {...editorValidationProps(ctrl)}
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
      }}
      onBlur={(event) => {
        // Moving between this group's own checkboxes is not leaving the
        // editor — committing there would close the cell on the first Tab.
        if (event.currentTarget.contains(event.relatedTarget)) return;
        ctrl.commitOnBlur();
      }}
    >
      {ctrl.selectOptions.map((option, index) => (
        <Checkbox
          key={option.value}
          label={option.label}
          value={option.value}
          checked={selected.includes(option.value)}
          onToggle={() => toggle(option.value)}
          onKeyDown={onKeyDown}
          focusRef={index === 0 ? ctrl.focusRef : undefined}
        />
      ))}
    </div>
  );
}
