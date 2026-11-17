import { it } from "vitest";

import { autoSizeColumnsTests } from "../../react/test/kit/suites/autoSizeColumns";
import { kit } from "./data-table.test-utils";

for (const test of autoSizeColumnsTests(kit)) it(test.name, test.run);
