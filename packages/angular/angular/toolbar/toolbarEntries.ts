/**
 * The saved-views and column-menu toolbar entries. Each draws its kit's menu
 * from the props its feature publishes, so the toolbar names neither.
 */
import {
  COLUMN_MENU_TOOLBAR_STATE,
  injectFeatureState,
  SAVED_VIEWS_TOOLBAR_STATE,
} from "@adapttable/angular";
import { AdaptSlot } from "@adapttable/angular/adapter";
import {
  COLUMN_MENU,
  type FeatureRender,
  SAVED_VIEWS,
  slotRender,
  TOOLBAR_EXTRAS,
  type ToolbarEntrySlotProps,
} from "@adapttable/core/binding";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type Type,
} from "@angular/core";

/** Draws the kit's saved-views menu in the toolbar. @internal */
@Component({
  selector: "adapt-saved-views-entry",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptSlot],
  host: { style: "display: contents" },
  template: `
    @if (menu(); as props) {
      <ng-container [adaptSlot]="slot" [adaptSlotProps]="props" />
    }
  `,
})
export class AdaptSavedViewsEntry {
  /** The toolbar's props. */
  readonly props = input.required<ToolbarEntrySlotProps>();
  protected readonly slot = SAVED_VIEWS;
  private readonly published = injectFeatureState(SAVED_VIEWS_TOOLBAR_STATE);
  protected readonly menu = computed(() => this.published()?.());
}

/** Draws the kit's Columns menu in the toolbar. @internal */
@Component({
  selector: "adapt-column-menu-entry",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdaptSlot],
  host: { style: "display: contents" },
  template: `
    @if (menu(); as props) {
      <ng-container [adaptSlot]="slot" [adaptSlotProps]="props" />
    }
  `,
})
export class AdaptColumnMenuEntry {
  /** The toolbar's props. */
  readonly props = input.required<ToolbarEntrySlotProps>();
  protected readonly slot = COLUMN_MENU;
  private readonly published = injectFeatureState(COLUMN_MENU_TOOLBAR_STATE);
  protected readonly menu = computed(() => this.published()?.());
}

/**
 * The saved-views feature's toolbar entry; a kit adds it beside its menu.
 *
 * @public
 */
export const SAVED_VIEWS_ENTRY: FeatureRender<
  ToolbarEntrySlotProps,
  Type<unknown>
> = slotRender(TOOLBAR_EXTRAS, () => AdaptSavedViewsEntry);

/**
 * The column-menu feature's toolbar entry; a kit adds it beside its menu.
 *
 * @public
 */
export const COLUMN_MENU_ENTRY: FeatureRender<
  ToolbarEntrySlotProps,
  Type<unknown>
> = slotRender(TOOLBAR_EXTRAS, () => AdaptColumnMenuEntry);
