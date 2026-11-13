import { it } from "vitest";

import { printButtonTests } from "../../react/test/kit/suites/printButton";
import { kit } from "./data-table.test-utils";

for (const test of printButtonTests(kit)) it(test.name, test.run);
