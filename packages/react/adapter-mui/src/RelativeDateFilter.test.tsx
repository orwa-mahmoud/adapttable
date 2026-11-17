import { it } from "vitest";

import { relativeDateFilterTests } from "../../react/test/kit/suites/relativeDateFilter";
import { kit } from "./data-table.test-utils";

for (const test of relativeDateFilterTests(kit)) it(test.name, test.run);
