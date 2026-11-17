import { it } from "vitest";

import { groupingLocaleTests } from "../../react/test/kit/suites/groupingLocale";
import { kit } from "./data-table.test-utils";

for (const test of groupingLocaleTests(kit)) it(test.name, test.run);
