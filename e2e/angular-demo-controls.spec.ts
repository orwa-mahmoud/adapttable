/** Every Angular kit matches the React live demo on each control. */
import { test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { assertLiveDemo } from "./demo-controls";

for (const kit of builtAdapters("angular")) {
  test(`${kit.key} matches the React live demo`, async ({ page }) => {
    test.setTimeout(120_000);
    await assertLiveDemo(page, "angular", kit.key);
  });
}
