import type { Direction, TableDensity, TableLabels } from "@adapttable/core";

/**
 * What a kit read from its own library. An explicit table input still wins,
 * and a field left unset stays unset.
 */
export interface KitEnvironment {
  readonly dir?: Direction;
  readonly locale?: string;
  readonly labels?: Partial<TableLabels>;
  readonly density?: TableDensity;
}
