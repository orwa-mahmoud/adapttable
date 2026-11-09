/**
 * High-contrast chrome that every Vue kit mounts once.
 *
 * Core stays headless: this is a `<style>` tag, not a painted control. Windows
 * High Contrast (`forced-colors: active`) drops authored fills and box-shadows,
 * so focus, selection, dirty cells, validation and find hits each keep a
 * system-color *outline*. `prefers-contrast: more` thickens the same focus
 * outline for kits that expose no contrast hook of their own.
 */
import { ensureForcedColorsStyles } from "@adapttable/core/binding";
import { getCurrentInstance, onMounted } from "vue";

/**
 * Install the high-contrast stylesheet once this table is mounted.
 *
 * Call from setup. A shell created outside a component has no mount, and
 * server rendering does not run the mount hook, so neither path touches
 * `document`. A second table finds the sheet already present.
 *
 * @public
 */
export function mountForcedColorsStyles(): void {
  if (!getCurrentInstance()) return;
  onMounted(() => {
    ensureForcedColorsStyles();
  });
}
