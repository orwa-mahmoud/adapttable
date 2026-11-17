import { it } from "vitest";

import { editConflictTests } from "../../react/test/kit/suites/editConflict";
import { kit } from "./data-table.test-utils";

for (const test of editConflictTests(kit)) it(test.name, test.run);
