/** React kits follow their own provider, not the page's dir and locale props. */
import { test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { assertLibraryKit } from "./library-environment";

for (const kit of builtAdapters("react")) {
  test(`${kit.key}: the kit provider owns direction, locale, a pin and the columns menu`, async ({
    page,
  }) => {
    await assertLibraryKit(page, "react", kit);
  });
}
