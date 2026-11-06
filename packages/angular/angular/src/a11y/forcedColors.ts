/**
 * High-contrast chrome that every Angular kit mounts once.
 *
 * Core stays headless: this is a `<style>` tag, not a painted control. Windows
 * High Contrast (`forced-colors: active`) drops authored fills and box-shadows,
 * so focus, selection, dirty cells, validation and find hits each keep a
 * system-color *outline*. `prefers-contrast: more` thickens the same focus
 * outline for kits that expose no contrast hook of their own.
 */
import { ensureForcedColorsStyles } from "@adapttable/core/binding";
import { afterNextRender } from "@angular/core";

export {
  ensureForcedColorsStyles,
  FORCED_COLORS_CSS,
} from "@adapttable/core/binding";

/**
 * Install the high-contrast stylesheet after this table's first render.
 *
 * Call from the table host's injection context. Server rendering never runs
 * the callback, so it does not touch `document`. A second table finds the
 * sheet already present.
 *
 * @public
 */
export function mountForcedColorsStyles(): void {
  afterNextRender(() => {
    ensureForcedColorsStyles();
  });
}
