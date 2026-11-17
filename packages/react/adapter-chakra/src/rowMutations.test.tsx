import { it } from "vitest";

import { rowMutationsTests } from "../../react/test/kit/suites/rowMutations";
import { kit } from "./data-table.test-utils";

for (const test of rowMutationsTests(kit)) it(test.name, test.run);
