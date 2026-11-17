/** The host's class for a part the binding draws, when the kit has a map. */

/**
 * A hook giving the host's class for a part the binding draws itself.
 *
 * @public
 */
export type KitUsePartClass = () => (part: string) => string | undefined;

const NO_PART_CLASS = (): undefined => undefined;

/** No class for any part: the default for a kit without a class map. */
export const noPartClass: KitUsePartClass = () => NO_PART_CLASS;
