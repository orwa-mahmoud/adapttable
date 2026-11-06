import { DirectionContext } from "@base-ui/react/internals/direction-context";
import { useContext } from "react";

/**
 * Base UI's app-wide direction.
 *
 * `useDirection()` reports `ltr` when no provider is mounted, so the table
 * reads `DirectionContext` itself and applies a value only when a
 * `DirectionProvider` is present. An explicit `ltr` provider then beats a
 * right-to-left page. Base UI has no app-wide locale, size or motion switch.
 */
export function useBaseUiLibrary(): { dir?: "ltr" | "rtl" } {
  const ctx = useContext(DirectionContext);
  if (!ctx) return {};
  const dir =
    ctx.direction === "rtl" || ctx.direction === "ltr"
      ? ctx.direction
      : undefined;
  return { dir };
}
