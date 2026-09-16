/**
 * Every kit stylesheet a showcase page has to carry — imported once, here.
 *
 * Each page ships a kit switcher, so any page can be asked to render any of
 * the eight kits. Two of them need a static stylesheet that nothing loads on
 * demand:
 *
 * - **Mantine** ships `@mantine/core/styles.css`. It is the default kit and it
 *   mounts eagerly, so without this a page paints unstyled native controls
 *   before the reader touches anything.
 * - **Tailwind and shadcn/ui** are utility-class kits: their look *is*
 *   `tailwind.css`, compiled from the classes the demos and
 *   `@adapttable/shadcn` name.
 *
 * The rest need nothing at the page level, and this is the list to check
 * before adding an import:
 *
 * - MUI (emotion), Chakra and Ant Design inject their own CSS at runtime.
 * - `@adapttable/base-ui` injects its sheet from its entry point
 *   (`ensureBaseUiStyles`), so importing the package is enough.
 * - Radix Themes' sheet is 800 KB — it loads with the Radix chunk that needs
 *   it (`adapters/RadixDemo.tsx` and the `radix` provider in
 *   `kitProviders.tsx`), never on the twenty pages that may never show it.
 *
 * Page entries import this module and never a kit stylesheet directly:
 * `scripts/showcase-pages.test.mjs` walks the page manifest and fails a page
 * whose entry skips it. That check is why `/columns/` cannot go back to
 * rendering a bare HTML table under a Mantine switch.
 */

import "@mantine/core/styles.css";
import "./tailwind.css";
