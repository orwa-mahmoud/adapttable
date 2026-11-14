import { it } from "vitest";

import { treeDataTests } from "../../react/test/kit/suites/treeData";
import { kit } from "./data-table.test-utils";

for (const test of treeDataTests(kit)) it(test.name, test.run);
