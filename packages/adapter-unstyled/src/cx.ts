/**
 * Join class-name parts, dropping falsy values. Tiny `clsx`-style helper
 * so the unstyled adapter has no runtime dependencies.
 *
 * @param parts - Class names or falsy values.
 * @returns The space-joined class string.
 *
 * @public
 */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
