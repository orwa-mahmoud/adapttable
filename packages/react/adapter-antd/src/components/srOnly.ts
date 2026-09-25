import type { CSSProperties } from "react";

/** Visually-hidden text for screen readers (the classic sr-only recipe). */
export const SR_ONLY: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
