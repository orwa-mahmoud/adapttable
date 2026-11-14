import { it } from "vitest";

import { mobileCardsMemoTests } from "../../react/test/kit/suites/mobileCardsMemo";
import { kit } from "./data-table.test-utils";

for (const test of mobileCardsMemoTests(kit)) it(test.name, test.run);
