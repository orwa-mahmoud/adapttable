import { it } from "vitest";

import { sidePanelStatusBarTests } from "../../react/test/kit/suites/sidePanelStatusBar";
import { kit } from "./data-table.test-utils";

for (const test of sidePanelStatusBarTests(kit)) it(test.name, test.run);
