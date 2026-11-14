import { it } from "vitest";

import { groupCardsTests } from "../../../react/test/kit/suites/groupCards";
import { kit } from "../data-table.test-utils";

for (const test of groupCardsTests(kit)) it(test.name, test.run);
