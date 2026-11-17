import type { CSSProperties } from "react";

/**
 * Clipped rather than hidden: a screen reader ignores `display: none` and
 * `visibility: hidden`, so text read aloud and shown nowhere stays in the
 * layout while taking no visible space.
 */
export const VISUALLY_HIDDEN: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  margin: "-1px",
  padding: 0,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
