/**
 * Shared editable-cell pieces used by the gate and row/batch cell hosts.
 *
 * Kept separate so {@link AdaptEditableCellGate} and the row/batch cells do
 * not import each other at runtime.
 */
import {
  type editableCellController,
  type EditableCellEditing,
} from "@adapttable/angular";
import {
  booleanDraft,
  type CellConflictAsk,
  formatMultiDraft,
} from "@adapttable/core";
import type { EditableCellButtonProps } from "@adapttable/core/binding";
import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  TemplateRef,
  type Type,
} from "@angular/core";

import { AdaptControl } from "../control";

export type { CellConflictAsk } from "@adapttable/core";

/**
 * Kit-supplied controls for editable-cell Chrome.
 *
 * @public
 */
export interface EditableCellSlots {
  /** Idle activate control. */
  readonly Activate: Type<unknown>;
  /** Conflict / undo button. */
  readonly Button: Type<unknown>;
}

/**
 * Props for a kit-native editor while a cell is active.
 *
 * @public
 */
export interface EditableCellEditorCtrl {
  /** The value being edited, as text. */
  draft: string;
  /** Replaces the draft on every keystroke. */
  setDraft: (value: string) => void;
  /** Handles Enter, Escape and Tab for the editor. */
  onEditorKeyDown: (event: {
    key: string;
    preventDefault: () => void;
    shiftKey?: boolean;
  }) => void;
  /** Commits the draft when focus leaves the editor. */
  commitOnBlur: () => void;
  /** The editor shape this column declared. */
  editor: NonNullable<ReturnType<typeof editableCellController>["editor"]>;
  /** Choices for a select editor, empty for other shapes. */
  selectOptions: ReturnType<typeof editableCellController>["selectOptions"];
  /** Accessible name for the editor control. */
  label: string;
  /** A validator's message for this cell, when the last commit was rejected. */
  error?: string;
  /** Whether an async validator is still deciding. */
  validating: boolean;
  /** `id` of the element holding the message. */
  errorId: string;
  /** Attach as the editor's focus callback so the table decides focus. */
  focusRef: (node: { focus: () => void } | null) => void;
  /** A live row changed under this editor. */
  conflict?: boolean;
}

/**
 * Props for {@link AdaptCellConflictNotice}.
 *
 * @public
 */
export interface CellConflictNoticeProps {
  /** The question, or `undefined` when this cell is not being asked about. */
  readonly ask?: CellConflictAsk;
  /** Labels for the notice — already resolved. */
  readonly labels?: NonNullable<EditableCellEditing<never>["conflictLabels"]>;
  /** Id the editor points at with `aria-describedby`. */
  readonly errorId: string;
  /** Class for the notice. */
  readonly errorClassName?: string;
  /** The kit's components for each part. */
  readonly slots: EditableCellSlots;
}

/**
 * Toggle a checkbox editor and commit in the same gesture.
 *
 * @public
 */
export function commitBooleanDraft(
  ctrl: EditableCellEditorCtrl,
  checked: boolean
): void {
  ctrl.setDraft(booleanDraft(checked));
  ctrl.commitOnBlur();
}

/**
 * The draft for a native `<select multiple>`'s current selection.
 *
 * @public
 */
export function multiDraftFromSelect(select: HTMLSelectElement): string {
  return formatMultiDraft(
    [...select.selectedOptions].map((option) => option.value)
  );
}

/**
 * The notice one cell shows when its stored value moved under the editor.
 *
 * @public
 */
@Component({
  selector: "adapt-cell-conflict-notice",
  imports: [AdaptControl],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let currentAsk = ask();
    @let currentLabels = labels();
    <span
      [attr.id]="errorId()"
      role="alert"
      data-adapttable-part="edit-cell-conflict"
      data-conflict=""
      [class]="errorClassName()"
    >
      <span data-adapttable-part="edit-cell-conflict-message">{{
        currentLabels.message
      }}</span>
      <span data-adapttable-part="edit-cell-incoming" style="display: block">{{
        currentLabels.theirsValue(currentAsk.incomingValue)
      }}</span>
      <ng-container
        [adaptControl]="slots().Button"
        [adaptControlProps]="keepProps()"
      />
      <ng-container
        [adaptControl]="slots().Button"
        [adaptControlProps]="takeProps()"
      />
    </span>
  `,
})
export class AdaptCellConflictNotice {
  /** The question. */
  readonly ask = input.required<CellConflictAsk>();
  /** Labels for the notice. */
  readonly labels =
    input.required<NonNullable<EditableCellEditing<never>["conflictLabels"]>>();
  /** Id the editor points at. */
  readonly errorId = input.required<string>();
  /** Class for the notice. */
  readonly errorClassName = input<string>();
  /** The kit's controls. */
  readonly slots = input.required<EditableCellSlots>();

  private readonly holdFocus = (event: { preventDefault: () => void }) => {
    event.preventDefault();
  };

  protected readonly keepProps = computed((): EditableCellButtonProps => {
    const ask = this.ask();
    const labels = this.labels();
    return {
      label: labels.keepMine,
      part: "edit-cell-keep-mine",
      onMouseDown: this.holdFocus,
      onClick: (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        ask.keep();
      },
    };
  });

  protected readonly takeProps = computed((): EditableCellButtonProps => {
    const ask = this.ask();
    const labels = this.labels();
    return {
      label: labels.takeTheirs,
      part: "edit-cell-take-theirs",
      onMouseDown: this.holdFocus,
      onClick: (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        ask.take();
      },
    };
  });
}

/**
 * Pass-through host for a kit's idle content: stamp its Angular template,
 * or show the printable value it supplied.
 *
 * @internal
 */
@Component({
  selector: "adapt-editable-cell-display",
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @if (template(); as content) {
      <ng-container [ngTemplateOutlet]="content" />
    } @else {
      {{ props() }}
    }
  `,
})
export class AdaptEditableCellDisplay {
  readonly props = input.required<unknown>();
  protected readonly template = computed(() => {
    const content = this.props();
    return content instanceof TemplateRef ? content : null;
  });
}
