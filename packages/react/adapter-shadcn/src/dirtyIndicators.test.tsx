import { it } from "vitest";

import { dirtyIndicatorsTests } from "../../react/test/kit/suites/dirtyIndicators";
import { kit } from "./data-table.test-utils";

for (const test of dirtyIndicatorsTests(kit)) it(test.name, test.run);
