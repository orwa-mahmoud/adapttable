import { it } from "vitest";

import { batchEditingTests } from "../../react/test/kit/suites/batchEditing";
import { kit } from "./data-table.test-utils";

for (const test of batchEditingTests(kit)) it(test.name, test.run);
