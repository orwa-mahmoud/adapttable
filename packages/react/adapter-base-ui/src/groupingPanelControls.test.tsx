import { it } from "vitest";

import { groupingPanelControlsTests } from "../../react/test/kit/suites/groupingPanelControls";
import { kit } from "./data-table.test-utils";

for (const test of groupingPanelControlsTests(kit)) it(test.name, test.run);
