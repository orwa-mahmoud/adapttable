import type { Framework, KitInfo } from "./detect";
import { type FrameworkTemplate, type ScaffoldFile } from "./starter";
import { ANGULAR_TEMPLATE } from "./templates/angular";
import { REACT_TEMPLATE } from "./templates/react";
import { VUE_TEMPLATE } from "./templates/vue";

export type { ScaffoldFile } from "./starter";
export { STARTER_PATH } from "./templates/react";

/** Every framework's template; one scaffold core writes them all. */
const TEMPLATES: Readonly<Record<Framework, FrameworkTemplate>> = {
  react: REACT_TEMPLATE,
  angular: ANGULAR_TEMPLATE,
  vue: VUE_TEMPLATE,
};

/**
 * The template for a framework.
 *
 * @param framework - The framework to scaffold.
 * @returns Its template.
 */
export function templateFor(framework: Framework): FrameworkTemplate {
  return TEMPLATES[framework];
}

/** The template for a kit's framework; a kit naming none is React. */
function templateOf(info: KitInfo): FrameworkTemplate {
  return templateFor(info.framework ?? "react");
}

/**
 * Build the starter table component source for a kit, using its framework's
 * table component with `data`, `columns` and `rowKey`.
 *
 * @param info - The chosen kit.
 * @returns The starter component source.
 * @public
 */
export function starterComponent(info: KitInfo): string {
  return templateOf(info).component(info);
}

/**
 * Compute the scaffold file(s) for a kit: the starter component first, then
 * the host setup its kit needs.
 *
 * @param info - The chosen kit.
 * @returns The files to write.
 * @public
 */
export function scaffoldFiles(info: KitInfo): ScaffoldFile[] {
  const template = templateOf(info);
  return [
    { path: template.componentPath, contents: template.component(info) },
    ...template.setupFiles(info),
  ];
}

/**
 * The package list for a kit (core + its framework's binding + adapter +
 * extras). This list does not check package availability in a registry.
 *
 * @param info - The chosen kit.
 * @returns The ordered package list.
 * @public
 */
export function packagesFor(info: KitInfo): string[] {
  return [
    "@adapttable/core",
    ...templateOf(info).bindings,
    info.adapter,
    ...info.extras,
  ];
}
