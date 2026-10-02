/**
 * Per-adapter accent + blurb — what the live-demo switcher cards and the hero
 * chips are painted with. The real adapter components do the actual styling;
 * these are for the marketing chrome around them.
 *
 * The values live in `matrix.mjs`, beside the rest of each kit's identity, so
 * the switcher, the nav's Adapters menu and that kit's own landing page cannot
 * describe it differently. This is the typed view of them.
 */
import { adaptersOf } from "../matrix.mjs";

export interface AdapterToken {
  key: string;
  label: string;
  blurb: string;
  accentLight: string;
  accentDark: string;
}

/** The React kits — the ones the switcher can mount on these pages. */
export const ADAPTER_TOKENS: AdapterToken[] = adaptersOf("react");
