/**
 * A feature built for one row type, composed into a table of another.
 *
 * This file MUST NOT compile, and the diagnostic must name the feature — a
 * caller who mixes two row types has to be told which entry is wrong, not
 * handed a mismatch on the whole array.
 */
import type { TableFeature } from "@adapttable/core";
import { editing } from "@adapttable/core/features";

interface Person {
  id: string;
  name: string;
}
interface Product {
  sku: number;
}

const forPeople = editing<Person>(() => undefined);

export const wrong: readonly TableFeature<Product>[] = [forPeople];
