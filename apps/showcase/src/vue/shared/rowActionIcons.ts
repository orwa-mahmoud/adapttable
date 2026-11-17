/** The people table's row-action icons, drawn from the shared glyph paths. */
import type { RowAction } from "@adapttable/vue";
import { type FunctionalComponent, h } from "vue";

import {
  ROW_ACTION_ICON_PATHS,
  ROW_ACTION_ICON_SVG,
} from "../../shared/peopleActions";

const ICONS: Readonly<Partial<Record<string, FunctionalComponent>>> =
  Object.fromEntries(
    Object.entries(ROW_ACTION_ICON_PATHS).map(([key, paths]) => [
      key,
      () =>
        h(
          "svg",
          ROW_ACTION_ICON_SVG,
          paths.map((d) => h("path", { d }))
        ),
    ])
  );

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
