import { it } from "vitest";

import { saveStateTests } from "../../react/test/kit/suites/saveState";
import { kit } from "./data-table.test-utils";

for (const test of saveStateTests(kit)) it(test.name, test.run);
