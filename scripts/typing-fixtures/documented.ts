/**
 * Every feature composition the docs show, written exactly as the docs write
 * it: no type arguments anywhere. That IS the assertion — this file has to
 * compile clean.
 */
import type { TableFeature } from "@adapttable/react";
import {
  columnMenu,
  grouping,
  multiSort,
  rowReorder,
  virtualize,
} from "@adapttable/react/features";

interface Person {
  id: string;
  name: string;
  team: string;
}

export const documented: readonly TableFeature<Person>[] = [
  grouping("team"),
  virtualize(),
  columnMenu(),
  multiSort(),
  rowReorder(() => undefined),
];
