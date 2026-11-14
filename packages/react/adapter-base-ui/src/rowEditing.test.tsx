import { it } from "vitest";

import { rowEditingTests } from "../../react/test/kit/suites/rowEditing";
import { kit } from "./data-table.test-utils";

for (const test of rowEditingTests(kit)) it(test.name, test.run);
