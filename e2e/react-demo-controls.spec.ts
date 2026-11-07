/** The Mantine live demo is the reference the other frameworks match. */
import { test } from "@playwright/test";

import { assertLiveDemo } from "./demo-controls";

test("mantine live demo defines the control contract", async ({ page }) => {
  test.setTimeout(120_000);
  await assertLiveDemo(page, "react", "mantine");
});
