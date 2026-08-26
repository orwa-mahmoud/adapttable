import type { TableFeature } from "@adapttable/core";

const OUTER: TableFeature[] = [
  {
    id: "nested-outer-plugin",
    setup(host) {
      host.registerCommand({
        key: "nested-outer",
        label: "Outer table plugin",
        onSelect: () => undefined,
      });
    },
  },
];

const INNER: TableFeature[] = [
  {
    id: "nested-inner-plugin",
    setup(host) {
      host.registerCommand({
        key: "nested-inner",
        label: "Inner table plugin",
        onSelect: () => undefined,
      });
    },
  },
];

/** Stable plugin list for the parent of the nested-tables demo. */
export function nestedOuterFeatures<TRow>(): readonly TableFeature<TRow>[] {
  return OUTER as readonly TableFeature<TRow>[];
}

/** Stable plugin list for the inner orders table. */
export function nestedInnerFeatures<TRow>(): readonly TableFeature<TRow>[] {
  return INNER as readonly TableFeature<TRow>[];
}
