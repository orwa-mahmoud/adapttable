/** Reads one dot path from a value; `undefined` for any missing segment. */
export type PathReader = (value: unknown) => unknown;

const readNothing: PathReader = () => undefined;

/** One step of a path: the property, when the value can hold one. */
function step(value: unknown, segment: string): unknown {
  return value != null && typeof value === "object"
    ? (value as Record<string, unknown>)[segment]
    : undefined;
}

/**
 * A reader for one dot path, with the path split once. Use it where a path
 * is resolved once and read for every row; it answers exactly as
 * {@link getPath} does for the same path.
 */
export function pathReader(path: string): PathReader {
  if (!path) return readNothing;
  if (!path.includes(".")) return (value) => step(value, path);
  const segments = path.split(".");
  return (value) => {
    let current: unknown = value;
    for (const segment of segments) {
      current = step(current, segment);
      if (current === undefined) return undefined;
    }
    return current;
  };
}

/**
 * Safe dot-path lookup: `getPath(row, "department.name")`. Returns
 * `undefined` for any missing segment instead of throwing, so declarative
 * column keys can reach nested API payloads without optional-chaining
 * ceremony in user code. Also tolerates an empty/undefined `path` (returns
 * `undefined`) so a transiently-malformed column key can never crash a render.
 *
 * @public
 */
export function getPath(value: unknown, path: string): unknown {
  if (!path) return undefined;
  if (!path.includes(".")) return step(value, path);
  let current: unknown = value;
  for (const segment of path.split(".")) {
    current = step(current, segment);
    if (current === undefined) return undefined;
  }
  return current;
}
