import { it } from "vitest";

import { activeFilterChipsTests } from "../../../react/test/kit/suites/activeFilterChips";
import { kit } from "../data-table.test-utils";

for (const test of activeFilterChipsTests(kit)) it(test.name, test.run);
