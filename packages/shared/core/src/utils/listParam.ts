import { safeDecode } from "./safeDecode";

/**
 * A list param's entries: split at its commas, each decoded and trimmed,
 * empty ones dropped.
 */
export function splitListParam(raw: string): string[] {
  return raw
    .split(",")
    .map((entry) => safeDecode(entry).trim())
    .filter(Boolean);
}

/**
 * A list as one param: each entry trimmed, empty ones dropped, each encoded
 * so an entry may hold a comma, joined with commas.
 */
export function joinListParam(values: readonly unknown[]): string {
  return values
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .map((entry) => encodeURIComponent(entry))
    .join(",");
}
