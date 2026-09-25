/**
 * Muted secondary-text color that meets WCAG AA contrast in both light and
 * dark mode. Chakra's bare `gray.500` lands around 4.2:1 on the default
 * dark surface (below the 4.5:1 AA threshold for body text); `gray.600`
 * light / `gray.400` dark clears AA in both. Spread onto a `<Text>`:
 * `<Text {...subtleText}>`.
 */
export const subtleText = {
  color: "gray.600",
  _dark: { color: "gray.400" },
} as const;
