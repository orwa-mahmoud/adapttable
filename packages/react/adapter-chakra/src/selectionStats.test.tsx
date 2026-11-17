import { it } from "vitest";

import { selectionStatsTests } from "../../react/test/kit/suites/selectionStats";
import { kit } from "./data-table.test-utils";

for (const test of selectionStatsTests(kit)) it(test.name, test.run);
