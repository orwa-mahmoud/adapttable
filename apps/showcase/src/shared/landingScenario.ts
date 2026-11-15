/**
 * The landing page's working table, written once for React, Vue and
 * Angular: its URL namespace, its Flat/Grouped switch, and whether it opens
 * grouped. The features it composes are each framework's kit factories.
 */

/** The landing table's URL namespace, shared with the live demo. */
export const LANDING_URL_KEY = "live";

/** How the landing table arranges its rows. */
export type LandingArrangement = "flat" | "grouped";

/** The arrangements, in the order the page offers them. */
export const LANDING_ARRANGEMENTS: readonly {
  readonly value: LandingArrangement;
  readonly label: string;
}[] = [
  { value: "flat", label: "Flat" },
  { value: "grouped", label: "Grouped" },
];

/**
 * Whether the page opens grouped: a link that carries a grouping opens on
 * it, so a grouped table survives a reload and a shared address.
 *
 * @returns The opening arrangement.
 */
export function landingArrangement(): LandingArrangement {
  if (typeof window === "undefined") return "flat";
  const params = new URLSearchParams(window.location.search);
  return params.has(`${LANDING_URL_KEY}.groupBy`) ? "grouped" : "flat";
}
