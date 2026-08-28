/**
 * Default column-header text from a key: the last dot-path segment, split on
 * camelCase / snake_case / kebab-case boundaries and title-cased.
 * `"hiredAt"` → `"Hired At"`, `"department.name"` → `"Name"`,
 * `"first_name"` → `"First Name"`. An empty/undefined `key` returns `""` so a
 * transiently-malformed column key can never crash a render.
 *
 * @public
 */
export function humanizeKey(key: string): string {
  if (!key) return "";
  // `split` always yields at least one element, so the last one exists.
  const segment = key.split(".").at(-1)!;
  const words = segment
    .replaceAll(/([a-z\d])([A-Z])/g, "$1 $2")
    .replaceAll(/[_-]+/g, " ")
    .trim()
    .split(/\s+/);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
