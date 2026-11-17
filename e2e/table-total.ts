/**
 * How many rows match, whatever the page shows: a table showing part of
 * its rows reports the total as `aria-rowcount`, a card list on every card
 * as `aria-setsize`; when every row is on the page, they are counted.
 */
import { expect, type Locator } from "@playwright/test";

/**
 * Assert how many rows match within `root`, across every page.
 *
 * @param root - The element holding one table or card list.
 * @param count - The expected total.
 */
export async function expectMatchingRows(
  root: Locator,
  count: number
): Promise<void> {
  await expect
    .poll(() =>
      root.evaluate((element) => {
        const table = element.querySelector('[data-adapttable-part="table"]');
        if (table) {
          const total = table.getAttribute("aria-rowcount");
          return total === null
            ? table.querySelectorAll('[data-adapttable-part="row"]').length
            : Number(total);
        }
        const cards = element.querySelectorAll('[data-adapttable-part="card"]');
        const total = cards[0]?.getAttribute("aria-setsize");
        return total === null || total === undefined
          ? cards.length
          : Number(total);
      })
    )
    .toBe(count);
}
