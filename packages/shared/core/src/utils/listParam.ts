import { safeDecode } from "./safeDecode";

/**
 * A list param's entries — the exact inverse of how the table writes a
 * multi-value filter: split at its commas, each decoded and trimmed, empty
 * ones dropped. An entry that is not valid percent-encoding stays as it
 * arrived.
 *
 * @param raw - The parameter's value, as `URLSearchParams.get` returns it.
 * @returns The entries; none for an absent or empty parameter.
 *
 * @public
 */
export function splitListParam(raw: string | null | undefined): string[] {
  if (raw == null) return [];
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
