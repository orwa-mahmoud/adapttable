/**
 * High-contrast chrome for an Angular table.
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
import { afterNextRender, effect, signal } from "@angular/core";

/**
 * Add this table's high-contrast rules to the page after its first render,
 * and again whenever its features change.
 *
 * Call from the table host's injection context. Server rendering never runs
 * the render callback, so it does not touch `document`.
 *
 * @param features - Reads the composed features, each with its optional rules.
 *
 * @public
 */
export function mountForcedColorsStyles(
  features: () => readonly { readonly contrast?: ContrastRules }[]
): void {
  const rendered = signal(false);
  afterNextRender(() => {
    rendered.set(true);
  });
  effect(() => {
    const list = features();
    if (rendered()) ensureForcedColorsStyles(list);
  });
}
