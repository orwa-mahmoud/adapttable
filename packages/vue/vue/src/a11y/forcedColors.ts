/**
 * High-contrast chrome for a Vue table.
 *
 * Core stays headless: this is a `<style>` tag, not a painted control. Windows
 * High Contrast (`forced-colors: active`) drops authored fills and box-shadows,
 * so focus, selection, dirty cells, validation and find hits each keep a
 * system-color *outline*. `prefers-contrast: more` thickens the same focus
 * outline for kits that expose no contrast hook of their own. The base rules
 * load with every table; each composed feature adds the rules for what it
 * draws.
 */
import {
  type ContrastRules,
  ensureForcedColorsStyles,
} from "@adapttable/core/binding";
import { getCurrentInstance, onMounted, watch } from "vue";

/**
 * Add this table's high-contrast rules to the page once it is mounted, and
 * again whenever its features change.
 *
 * Call from setup. A shell created outside a component has no mount, and
 * server rendering does not run the mount hook, so neither path touches
 * `document`.
 *
 * @param features - Reads the composed features, each with its optional rules.
 *
 * @public
 */
export function mountForcedColorsStyles(
  features: () => readonly { readonly contrast?: ContrastRules }[]
): void {
  if (!getCurrentInstance()) return;
  let mounted = false;
  onMounted(() => {
    mounted = true;
    ensureForcedColorsStyles(features());
  });
  watch(features, (list) => {
    if (mounted) ensureForcedColorsStyles(list);
  });
}
