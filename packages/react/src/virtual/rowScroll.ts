import { createContext } from "react";

/**
 * Bring a row into a virtualized body's window.
 *
 * The `virtualize` body provides it and find calls it when its walk moves:
 * the body is mounted above find, so the channel runs from the window down.
 * `null` without a virtual body, where every row is already rendered. Rows
 * are untyped on both sides of a feature slot, hence `never`.
 */
export const RowScrollContext = createContext<((row: never) => void) | null>(
  null
);
