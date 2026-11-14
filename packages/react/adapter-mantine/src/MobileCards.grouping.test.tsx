import { it } from "vitest";

import { mobileCardsGroupingTests } from "../../react/test/kit/suites/mobileCardsGrouping";
import { kit } from "./data-table.test-utils";

for (const test of mobileCardsGroupingTests(kit)) it(test.name, test.run);
