/**
 * Native row-edit actions — the kit fill for {@link ROW_EDIT_ACTIONS}.
 */
import {
  AdaptIcon,
  AdaptRowEditActionsChrome,
  type IconDescriptor,
  type RowEditActionsProps,
  type RowEditActionsSlots,
  type RowEditButtonProps,
} from "@adapttable/angular/adapter";
import { A11yModule } from "@angular/cdk/a11y";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";

/** A 16px glyph: a 2px round stroke on a 24-grid. */
function rowEditGlyph(paths: readonly string[]): IconDescriptor {
  return {
    viewBox: "0 0 24 24",
    width: 16,
    height: 16,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    focusable: "false",
    shapes: paths.map((d) => ({ tag: "path", d })),
  };
}

/** The glyph this kit draws for each row-mode control. */
const ROW_EDIT_GLYPHS: Readonly<Record<string, IconDescriptor>> = {
  "row-edit-begin": rowEditGlyph([
    "M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z",
    "M13.5 6.5l4 4",
  ]),
  "row-edit-save": rowEditGlyph(["M5 12.5l4.5 4.5L19 7.5"]),
  "row-edit-cancel": rowEditGlyph(["M6 6l12 12M18 6L6 18"]),
};

/**
 * One row-mode control. The host's `icon` wins: a value replaces the glyph,
 * `false` asks for the label as text; with neither, the kit draws its glyph
 * for the part and the label becomes the tooltip.
 */
@Component({
  selector: "adapt-row-edit-button",
  imports: [A11yModule, AdaptIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    @let face = content();
    <button
      cdkMonitorElementFocus
      data-adapttable-cdk-control
      type="button"
      [attr.data-adapttable-part]="p.part"
      [class]="p.className"
      [attr.aria-label]="p.label"
      [attr.title]="face.kind === 'label' ? null : p.label"
      (click)="p.onClick($event)"
    >
      @switch (face.kind) {
        @case ("glyph") {
          <svg [adaptIcon]="face.glyph"></svg>
        }
        @case ("host") {
          {{ face.icon }}
        }
        @default {
          {{ p.label }}
        }
      }
    </button>
  `,
})
class AdaptRowEditButton {
  readonly props = input.required<RowEditButtonProps>();

  protected readonly content = computed(
    ():
      | { readonly kind: "glyph"; readonly glyph: IconDescriptor }
      | { readonly kind: "host"; readonly icon: unknown }
      | { readonly kind: "label" } => {
      const { icon, part } = this.props();
      if (icon === false) return { kind: "label" };
      if (icon !== undefined && icon !== null) return { kind: "host", icon };
      const glyph = ROW_EDIT_GLYPHS[part];
      return glyph ? { kind: "glyph", glyph } : { kind: "label" };
    }
  );
}

/**
 * Edit, save and cancel for one row.
 *
 * @public
 */
@Component({
  selector: "adapt-row-edit-actions",
  imports: [AdaptRowEditActionsChrome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: "display: contents" },
  template: `
    @let p = props();
    <adapt-row-edit-actions-chrome
      [rowEditing]="p.rowEditing"
      [row]="p.row"
      [rowId]="p.rowId"
      [labels]="p.labels"
      [className]="p.className"
      [buttonClassName]="p.buttonClassName"
      [icons]="p.icons"
      [conflict]="p.conflict"
      [showBegin]="p.showBegin ?? true"
      [slots]="slots"
    />
  `,
})
export class AdaptRowEditActions<TRow> {
  /** Slot props from the table's row-edit-actions fill. */
  readonly props = input.required<RowEditActionsProps<TRow>>();
  /** The required button slot, without exposing the private implementation. */
  protected readonly slots: RowEditActionsSlots = {
    Button: AdaptRowEditButton,
  };
}
