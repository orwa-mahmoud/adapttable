/** Table-local loader identity tracking for the neutral filter runtime cache. */
import type { ColumnMetadata, FilterDef, FilterOption } from "@adapttable/core";
type Loader = () => Promise<readonly FilterOption[]>;
function columnLoader(filter: unknown): Loader | undefined {
  if (!filter || typeof filter !== "object" || !("options" in filter))
    return undefined;
  return typeof filter.options === "function"
    ? (filter.options as Loader)
    : undefined;
}
export function createFilterOptionCache<TRow>() {
  const cache = new Map<string, Loader>();
  let previous = new Map<string, Loader>();
  return {
    reconcile(
      columns: readonly ColumnMetadata<TRow>[],
      definitions: readonly FilterDef<TRow>[]
    ): Map<string, Loader> {
      const authored = new Map(
        definitions.map((definition) => [definition.key, definition])
      );
      const next = new Map<string, Loader>();
      for (const column of columns) {
        if (authored.has(column.key)) continue;
        const loader = columnLoader(column.filter);
        if (loader) next.set(column.key, loader);
      }
      for (const definition of definitions)
        if (typeof definition.options === "function")
          next.set(definition.key, definition.options);
      for (const [key, loader] of previous)
        if (next.get(key) !== loader) cache.delete(key);
      previous = next;
      return cache;
    },
    clear(): void {
      previous.clear();
      cache.clear();
    },
  };
}
