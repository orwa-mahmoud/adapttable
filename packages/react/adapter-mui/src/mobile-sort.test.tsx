import { it } from "vitest";

import { mobileSortTests } from "../../react/test/kit/suites/mobileSort";
import { kit } from "./data-table.test-utils";

for (const test of mobileSortTests(kit)) it(test.name, test.run);
