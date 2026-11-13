import { it } from "vitest";

import { rowPinningBareTests } from "../../react/test/kit/suites/rowPinningBare";
import { kit } from "./data-table.test-utils";

for (const test of rowPinningBareTests(kit)) it(test.name, test.run);
