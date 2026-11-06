import type { Direction, TableLabels } from "@adapttable/core";

import type { Density } from "../url/useDensityUrlState";

/**
 * What a UI library told the table, after the kit read its own provider.
 * Absent fields mean the library did not set that concern, so the page or
 * the operating system still decides.
 *
 * @public
 */
export interface KitEnvironment {
  /** Library direction, when a direction provider set one. */
  dir?: Direction;
  /** Library locale tag, when a locale provider set one. */
  locale?: string;
  /** Chrome labels for a locale `@adapttable/i18n` knows. */
  labels?: Partial<TableLabels>;
  /** Density mapped from a library-wide size, when that size is set. */
  density?: Density;
}

/**
 * Explicit table props win, then the kit's library setting. A field the
 * library left unset stays unset so the page direction or the default
 * density still applies.
 *
 * @public
 */
export function withKitEnvironment<
  P extends {
    dir?: Direction;
    locale?: string;
    labels?: Partial<TableLabels>;
    density?: Density;
  },
>(props: Readonly<P>, kit: KitEnvironment): P {
  return {
    ...props,
    dir: props.dir ?? kit.dir,
    locale: props.locale ?? kit.locale,
    labels: props.labels ?? kit.labels,
    density: props.density ?? kit.density,
  };
}
