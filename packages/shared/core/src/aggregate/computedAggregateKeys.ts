/**
 * The aggregate keys a grouped model produced. A scan of the group rows the
 * table already built, so a table can report them without loading the
 * aggregation rules.
 */

/**
 * Keys a computed group row actually produced.
 *
 * Presence only — never the operation. Empty groups and empty data produce
 * nothing here; declared metadata still stands on its own.
 *
 * @param entries - The flat grouped model, when one has been computed.
 * @returns Distinct aggregate keys, in first-seen order.
 *
 * @public
 */
export function computedAggregateKeys(
  entries: readonly {
    readonly kind: string;
    readonly aggregateCells?: Readonly<Record<string, unknown>>;
  }[]
): readonly string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.kind !== "group" && entry.kind !== "groupFooter") continue;
    const cells = entry.aggregateCells;
    if (!cells) continue;
    for (const key of Object.keys(cells)) {
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}
