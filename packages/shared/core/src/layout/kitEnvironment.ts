import type { Direction, TableLabels } from "../types";
import type { TableDensity } from "../url/viewStateSlices";

/**
 * What a UI library told the table, after the kit read its own provider.
 * Absent fields mean the library did not set that concern, so the page or
 * the operating system still decides.
 *
 * @public
 */
export interface KitEnvironment {
  /** Library direction, when a direction provider set one. */
  readonly dir?: Direction;
  /** Library locale tag, when a locale provider set one. */
  readonly locale?: string;
  /** Chrome labels for that locale, once loaded. */
  readonly labels?: Partial<TableLabels>;
  /** Density mapped from a library-wide size, when that size is set. */
  readonly density?: TableDensity;
}

/**
 * The table's props with the library's settings filled in. Explicit props
 * win, and a field the kit did not read stays untouched, so a library
 * default cannot override the page.
 *
 * @public
 */
export function withKitEnvironment<P extends KitEnvironment>(
  props: Readonly<P>,
  kit: KitEnvironment
): P {
  return {
    ...props,
    dir: props.dir ?? kit.dir,
    locale: props.locale ?? kit.locale,
    labels: props.labels ?? kit.labels,
    density: props.density ?? kit.density,
  };
}
