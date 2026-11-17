import { it } from "vitest";

import { mobileCardsSetSizeTests } from "../../react/test/kit/suites/mobileCardsSetSize";
import { kit } from "./data-table.test-utils";

for (const test of mobileCardsSetSizeTests(kit)) it(test.name, test.run);
