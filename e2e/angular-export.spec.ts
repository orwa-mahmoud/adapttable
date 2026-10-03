import { expect, type Page, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart, checkAngularCheckbox } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's export page: the toolbar button writes the page
     * on screen, searched as it is, with each column's export value.
     */

    const PAGE = `/${kit.key}/export/`;

    const part = (page: Page, name: string) => angularPart(kit, page, name);

    test("downloads a CSV of the searched rows with plain dates and numbers", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await part(page, "search").fill("Data");
      await expect(part(page, "row")).toHaveCount(6);
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        part(page, "export-csv-button").click(),
      ]);
      expect(download.suggestedFilename()).toBe("export.csv");
      const stream = await download.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      const lines = Buffer.concat(chunks)
        .toString("utf8")
        .trim()
        .split(/\r?\n/);
      expect(lines[0]).toBe("Person,Team,Status,Timeline,Budget,Load");
      expect(lines).toHaveLength(7);
      expect(lines[1]).toBe("Grace Hopper,Data,Archived,2026-07-22,39900,78%");
    });

    test("a selected export contains no unchecked rows", async ({ page }) => {
      await page.goto(`${PAGE}?scope=selected`);
      await checkAngularCheckbox(
        kit,
        part(page, "row").first().getByRole("checkbox")
      );
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        part(page, "export-csv-button").click(),
      ]);
      const stream = await download.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      const lines = Buffer.concat(chunks)
        .toString("utf8")
        .trim()
        .split(/\r?\n/);
      expect(lines).toHaveLength(2);
      expect(lines[1]?.split(",")[0]).toBe("Ada Lovelace");
    });

    test("a range export writes only the selected cells", async ({ page }) => {
      await page.goto(`${PAGE}?scope=range`);
      await part(page, "row")
        .first()
        .locator('[data-adapttable-part="cell"]')
        .first()
        .focus();
      await page.keyboard.press("Shift+ArrowDown");
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        part(page, "export-csv-button").click(),
      ]);
      const stream = await download.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(chunk as Buffer);
      expect(
        Buffer.concat(chunks).toString("utf8").trim().split(/\r?\n/)
      ).toEqual(["Person", "Ada Lovelace", "Alan Turing"]);
    });
  });
}
