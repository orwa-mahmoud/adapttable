import type { ReactNode } from "react";

/**
 * A kit-owned component mounted by shared adapter feature assembly.
 *
 * @public
 */
export type AdapterFeatureComponent<TProps> = (
  props: Readonly<TProps>
) => ReactNode;
