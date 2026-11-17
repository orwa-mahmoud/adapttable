import { it } from "vitest";

import { hostCallbacksTests } from "../../react/test/kit/suites/hostCallbacks";
import { kit } from "./data-table.test-utils";

for (const test of hostCallbacksTests(kit)) it(test.name, test.run);
