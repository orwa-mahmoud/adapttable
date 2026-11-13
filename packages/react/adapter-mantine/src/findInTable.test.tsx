import { it } from "vitest";

import { findInTableTests } from "../../react/test/kit/suites/findInTable";
import { kit } from "./data-table.test-utils";

for (const test of findInTableTests(kit)) it(test.name, test.run);
