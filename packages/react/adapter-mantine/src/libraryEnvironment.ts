import { DirectionContext } from "@mantine/core";
import { useContext } from "react";

/**
 * Mantine's app-wide direction.
 *
 * `DirectionProvider` is separate from `MantineProvider`. Without it the
 * context is the library default, and the table keeps following the page.
 * `detectDirection` still updates this value from the document after mount,
 * so a provider that is only mirroring the page stays in agreement with it.
 * Mantine core has no locale or component-size provider. `respectReducedMotion`
 * only opts Mantine into the operating-system preference the table already
 * follows, so it is not a second off switch.
 */
export function useMantineLibrary(): { dir?: "ltr" | "rtl" } {
  const ctx = useContext(DirectionContext);
  const provided = ctx.setDirection.length > 0;
  const dir = ctx.dir === "rtl" || ctx.dir === "ltr" ? ctx.dir : undefined;
  return { dir: provided ? dir : undefined };
}
