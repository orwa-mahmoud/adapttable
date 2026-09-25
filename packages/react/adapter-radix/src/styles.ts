/**
 * Muted secondary-text props for Radix Themes `<Text>`. Radix's `gray` accent
 * is tuned to clear WCAG AA contrast on both light and dark surfaces, so a
 * plain `color="gray"` is the accessible muted tone. Spread onto a `<Text>`:
 * `<Text {...subtleText}>`.
 */
export const subtleText = { color: "gray" } as const;
