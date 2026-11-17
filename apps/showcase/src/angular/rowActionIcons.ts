/** The people table's row-action icons, drawn from the shared glyph paths. */
import type { RowAction } from "@adapttable/angular";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  type Type,
} from "@angular/core";

import {
  ROW_ACTION_ICON_PATHS,
  ROW_ACTION_ICON_SVG,
} from "../shared/peopleActions";

/** One shared glyph, stroked in the button's colour. */
@Component({
  selector: "adapt-showcase-row-action-glyph",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    [attr.width]="svg.width"
    [attr.height]="svg.height"
    [attr.viewBox]="svg.viewBox"
    [attr.fill]="svg.fill"
    [attr.stroke]="svg.stroke"
    [attr.stroke-width]="svg['stroke-width']"
    [attr.stroke-linecap]="svg['stroke-linecap']"
    [attr.stroke-linejoin]="svg['stroke-linejoin']"
    aria-hidden="true"
  >
    @for (d of paths(); track d) {
      <path [attr.d]="d" />
    }
  </svg>`,
})
class RowActionGlyph {
  readonly key = input.required<string>();
  protected readonly svg = ROW_ACTION_ICON_SVG;
  protected paths(): readonly string[] {
    return ROW_ACTION_ICON_PATHS[this.key()] ?? [];
  }
}

@Component({
  selector: "adapt-showcase-edit-icon",
  imports: [RowActionGlyph],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<adapt-showcase-row-action-glyph key="edit" />`,
})
class EditIcon {}

@Component({
  selector: "adapt-showcase-delete-icon",
  imports: [RowActionGlyph],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<adapt-showcase-row-action-glyph key="delete" />`,
})
class DeleteIcon {}

const ICONS: Readonly<Partial<Record<string, Type<unknown>>>> = {
  edit: EditIcon,
  delete: DeleteIcon,
};

/**
 * The actions with their icons, so each kit draws them as icon buttons.
 *
 * @param actions - The row actions.
 * @returns The same actions, with an icon where one is drawn for the key.
 */
export function withRowActionIcons<TRow>(
  actions: readonly RowAction<TRow>[]
): RowAction<TRow>[] {
  return actions.map((action) => {
    const icon = ICONS[action.key];
    return icon ? { ...action, icon } : action;
  });
}
