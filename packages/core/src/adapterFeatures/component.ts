import type { ComponentType } from "react";

/**
 * A kit-owned component mounted by shared adapter feature assembly.
 *
 * Core owns the typed props and lifecycle; the component owns every visible
 * primitive, portal, focus policy and pixel.
 *
 * @public
 */
export type AdapterFeatureComponent<TProps> = ComponentType<Readonly<TProps>>;
