/**
 * ONE locale-tag resolution for everything locale-shaped: label presets
 * (`@adapttable/i18n`) and per-column `i18n` data paths resolve through
 * the same rules, so `locale="ar_EG"` can never pick Arabic labels while
 * missing the Arabic column paths.
 */

/** Normalize a BCP-47-ish tag: trim, `_` → `-`, lower-case. */
export function normalizeLocaleTag(locale: string): string {
  return locale.trim().replaceAll("_", "-").toLowerCase();
}

/**
 * Resolve a locale against a set of available tags: the exact tag first
 * (case- and separator-insensitive), then its primary subtag. Returns the
 * ORIGINAL available tag so callers can index their own maps with it.
 */
export function resolveLocaleTag(
  available: Iterable<string>,
  locale: string
): string | undefined {
  const target = normalizeLocaleTag(locale);
  const tags = [...available];
  const exact = tags.find((tag) => normalizeLocaleTag(tag) === target);
  if (exact !== undefined) return exact;
  const primary = target.split("-", 1)[0]!;
  return tags.find((tag) => normalizeLocaleTag(tag) === primary);
}
