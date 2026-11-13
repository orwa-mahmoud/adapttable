import { it } from "vitest";

import { rowActionsMenuTests } from "../../react/test/kit/suites/rowActionsMenu";
import { kit } from "./data-table.test-utils";

for (const test of rowActionsMenuTests(kit)) it(test.name, test.run);
