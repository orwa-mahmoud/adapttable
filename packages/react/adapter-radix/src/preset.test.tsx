import { it } from "vitest";

import { presetTests } from "../../react/test/kit/suites/preset";
import { kit } from "./data-table.test-utils";

for (const test of presetTests(kit)) it(test.name, test.run);
