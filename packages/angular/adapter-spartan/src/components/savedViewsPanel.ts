/**
 * Manage saved views: apply, rename, reorder, default, delete.
 *
 * Native markup carries no look of its own. The card, the row and the
 * controls are the binding's; this fills them with buttons and a text field.
 */
import type { SavedView, TableLabels } from "@adapttable/angular";
import {
  AdaptSavedViewGlyph,
  AdaptSavedViewsPanelChrome,
  type SavedViewsPanelSlots,
} from "@adapttable/angular/adapter";
import { NgTemplateOutlet } from "@angular/common";
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  input,
  type TemplateRef,
  viewChild,
} from "@angular/core";

import { HlmButton, HlmInput } from "../helm/controls";

/** One row's layout, as the chrome computed it. */
interface SavedViewsLayoutView {
  readonly row: Readonly<Record<string, string>>;
  readonly caption: Readonly<Record<string, string>>;
  readonly controls: Readonly<Record<string, string>>;
  readonly control: Readonly<Record<string, string>>;
}

/** One icon control on a row. */
interface SavedViewControlView {
  readonly key: string;
  readonly label: string;
  readonly glyph: {
    readonly paths: readonly string[];
    readonly filled: boolean;
  };
  readonly onPress?: () => void;
  readonly pressed?: boolean;
}

/** What the card receives. */
interface SavedViewsSurfaceView {
  readonly title: string;
  readonly className?: string;
  readonly children?: TemplateRef<unknown>;
  readonly footer?: TemplateRef<unknown>;
}

/** What one row receives. */
interface SavedViewsRowView {
  readonly name?: TemplateRef<unknown>;
  readonly viewName: string;
  readonly isEditing: boolean;
  readonly isDefault: boolean;
  readonly readOnly: boolean;
  readonly defaultLabel: string;
  readonly readOnlyLabel: string;
  readonly onApply: () => void;
  readonly applyLabel: string;
  readonly controls: readonly SavedViewControlView[];
  readonly layout: SavedViewsLayoutView;
}

/** The rename field. */
interface SavedViewsInputView {
  readonly label: string;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly onCommit: () => void;
  readonly onCancel: () => void;
}

/** The empty list. */
interface SavedViewsEmptyView {
  readonly message: string;
}

/** The name, growing, with the weight of the default view. */
function nameButtonStyle(isDefault: boolean): Record<string, string> {
  return {
    flex: "1 1 auto",
    minWidth: "0",
    textAlign: "start",
    fontWeight: isDefault ? "600" : "400",
  };
}

/** The card. */
@Component({
  selector: "adapt-saved-views-surface",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `<div
    data-adapttable-part="saved-views-panel"
    [class]="props().className"
    style="min-width: 0"
  >
    <span data-adapttable-part="saved-views-title" [style]="titleStyle">{{
      props().title
    }}</span>
    <div [style]="listStyle">
      @if (props().children; as children) {
        <ng-container [ngTemplateOutlet]="children" />
      }
    </div>
    @if (props().footer; as footer) {
      <span data-adapttable-part="saved-views-footer" [style]="footerStyle">
        <ng-container [ngTemplateOutlet]="footer" />
      </span>
    }
  </div>`,
})
class AdaptSavedViewsSurface {
  readonly props = input.required<SavedViewsSurfaceView>();

  protected readonly titleStyle = {
    display: "block",
    marginBlockEnd: "8px",
    fontSize: "0.7rem",
    fontWeight: "700",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    opacity: "0.7",
  };

  protected readonly listStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: "0",
  };

  protected readonly footerStyle = {
    display: "block",
    marginBlockStart: "10px",
    fontSize: "0.78rem",
    opacity: "0.75",
  };
}

/** One view: its name applies it, and the icon cluster follows. */
@Component({
  selector: "adapt-saved-views-row",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, AdaptSavedViewGlyph, NgTemplateOutlet],
  template: `<div
    data-adapttable-part="saved-view-row"
    [style]="props().layout.row"
  >
    <div
      data-adapttable-part="saved-view-caption"
      [style]="props().layout.caption"
    >
      @if (props().isEditing) {
        <ng-container [ngTemplateOutlet]="props().name" />
      } @else {
        <button
          adaptHlmButton
          type="button"
          [attr.title]="props().applyLabel"
          [style]="nameStyle()"
          (click)="props().onApply()"
        >
          {{ props().viewName }}
        </button>
      }
      @if (props().readOnly) {
        <span data-adapttable-part="saved-view-readonly">{{
          props().readOnlyLabel
        }}</span>
      }
      @if (props().isDefault) {
        <span data-adapttable-part="saved-view-default">{{
          props().defaultLabel
        }}</span>
      }
    </div>
    <div
      data-adapttable-part="saved-view-controls"
      [style]="props().layout.controls"
    >
      @for (control of props().controls; track control.key) {
        @if (control.onPress; as run) {
          <button
            adaptHlmButton
            type="button"
            [attr.data-control]="control.key"
            [style]="props().layout.control"
            [attr.aria-label]="control.label"
            [attr.aria-pressed]="control.pressed"
            [attr.title]="control.label"
            (click)="run()"
          >
            <adapt-saved-view-glyph [glyph]="control.glyph" />
          </button>
        } @else {
          <button
            adaptHlmButton
            type="button"
            disabled
            [attr.data-control]="control.key"
            [style]="props().layout.control"
            [attr.aria-label]="control.label"
            [attr.aria-pressed]="control.pressed"
            [attr.title]="control.label"
          >
            <adapt-saved-view-glyph [glyph]="control.glyph" />
          </button>
        }
      }
    </div>
  </div>`,
})
class AdaptSavedViewsRow {
  readonly props = input.required<SavedViewsRowView>();

  /** The name's weight: the default view is the one the table opens with. */
  protected readonly nameStyle = computed(() =>
    nameButtonStyle(this.props().isDefault)
  );
}

/**
 * The inline rename field. Focus moves here when the field arrives, because
 * a rename that leaves focus on the button it replaced is a rename the
 * keyboard cannot finish.
 */
@Component({
  imports: [HlmInput],
  selector: "adapt-saved-views-input",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    adaptHlmInput
    #box
    [attr.aria-label]="props().label"
    [value]="props().value"
    style="flex: 1 1 auto; min-width: 0"
    (input)="changed($event)"
    (keydown)="key($event)"
  />`,
})
class AdaptSavedViewsInput {
  readonly props = input.required<SavedViewsInputView>();

  private readonly box =
    viewChild.required<ElementRef<HTMLInputElement>>("box");

  constructor() {
    afterNextRender(() => {
      this.box().nativeElement.focus();
    });
  }

  /** Keep the draft as the reader types. */
  protected changed(event: Event): void {
    this.props().onChange((event.target as HTMLInputElement).value);
  }

  /** Enter keeps the name. Escape puts the old one back. */
  protected key(event: KeyboardEvent): void {
    if (event.key === "Enter") this.props().onCommit();
    if (event.key === "Escape") this.props().onCancel();
  }
}

/** The empty list. */
@Component({
  selector: "adapt-saved-views-empty",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>{{ props().message }}</p>`,
})
class AdaptSavedViewsEmpty {
  readonly props = input.required<SavedViewsEmptyView>();
}

const SLOTS: SavedViewsPanelSlots = {
  Surface: AdaptSavedViewsSurface,
  Row: AdaptSavedViewsRow,
  Input: AdaptSavedViewsInput,
  Empty: AdaptSavedViewsEmpty,
};

/**
 * The management card for a table's saved views.
 *
 * The toolbar menu switches views. This renames, reorders, picks the default
 * and deletes. Mount it where the list is managed; it does not replace the
 * menu.
 *
 * @public
 */
@Component({
  selector: "adapt-saved-views-panel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptSavedViewsPanelChrome],
  template: `<adapt-saved-views-panel-chrome
    [views]="views()"
    [onApply]="onApply()"
    [onRename]="onRename()"
    [onMove]="onMove()"
    [onSetDefault]="onSetDefault()"
    [onRemove]="onRemove()"
    [labels]="labels()"
    [footer]="footer()"
    [className]="className()"
    [slots]="slots"
  />`,
})
export class AdaptSavedViewsPanel {
  /** The list, in the order to show it. */
  readonly views = input.required<readonly SavedView[]>();

  /** Apply a view. */
  readonly onApply = input.required<(name: string) => void>();

  /** Rename a view. */
  readonly onRename = input.required<(from: string, to: string) => void>();

  /** Move a view by one step. */
  readonly onMove = input.required<(name: string, delta: number) => void>();

  /** Make a view the default, or clear it. */
  readonly onSetDefault = input.required<(name: string) => void>();

  /** Delete a view. */
  readonly onRemove = input.required<(name: string) => void>();

  /** Label overrides. Omitted keys keep the English default. */
  readonly labels = input<Partial<TableLabels>>();

  /** A note under the list. */
  readonly footer = input<TemplateRef<unknown> | string>();

  /** Class on the card. */
  readonly className = input<string>();

  /** The native card, row, field and empty state. */
  protected readonly slots = SLOTS;
}
