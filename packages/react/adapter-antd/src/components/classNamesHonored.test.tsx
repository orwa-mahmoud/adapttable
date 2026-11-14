import { it } from "vitest";

import { classNamesHonoredTests } from "../../../react/test/kit/suites/classNamesHonored";
import { kit } from "../data-table.test-utils";

for (const test of classNamesHonoredTests(kit)) it(test.name, test.run);
