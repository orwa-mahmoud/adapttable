import { it } from "vitest";

import { editHistoryTests } from "../../react/test/kit/suites/editHistory";
import { kit } from "./data-table.test-utils";

for (const test of editHistoryTests(kit)) it(test.name, test.run);
