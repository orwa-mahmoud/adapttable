import type { Direction, TableDensity, TableLabels } from "@adapttable/core";

/** What a kit read from its own library. Unset fields stay with the table. */
export interface KitEnvironment {
  readonly dir?: Direction;
  readonly locale?: string;
  readonly labels?: Partial<TableLabels>;
  readonly density?: TableDensity;
}

interface KitEnvironmentFields {
  readonly dir?: Direction;
  readonly locale?: string;
  readonly labels?: Partial<TableLabels>;
  readonly density?: TableDensity;
}

/**
 * Explicit table props win. A field the kit did not read stays untouched,
 * so a library default cannot override the page.
 */
export function withKitEnvironment<P extends KitEnvironmentFields>(
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
