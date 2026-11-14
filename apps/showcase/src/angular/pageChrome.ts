import type { AdaptTableFeature } from "@adapttable/angular";

import { pageChrome, type PageChromeFlags } from "../shared/pageChrome";
import type { Person } from "./data";
import type { ShowcaseKit } from "./showcaseKit";

/**
 * The chrome an Angular page carries, by the shared rule, drawn with the
 * kit's own factories.
 *
 * @param kit - The page's kit.
 * @param flags - What the page is.
 * @returns The chrome's features.
 */
export function pageChromeFeatures(
  kit: ShowcaseKit,
  flags: PageChromeFlags
): readonly AdaptTableFeature[] {
  const chrome = pageChrome(flags);
  return [
    ...(chrome.statusBar ? [kit.statusBar()] : []),
    ...(chrome.selectionStats ? [kit.selectionStats()] : []),
    ...(chrome.findInTable ? [kit.findInTable()] : []),
    kit.commandPalette(chrome.commandPalette),
    kit.contextMenu<Person>(chrome.contextMenu),
  ];
}
