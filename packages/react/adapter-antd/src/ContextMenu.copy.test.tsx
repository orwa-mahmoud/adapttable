import { it } from "vitest";

import { contextMenuCopyTests } from "../../react/test/kit/suites/contextMenuCopy";
import { kit } from "./data-table.test-utils";

for (const test of contextMenuCopyTests(kit)) it(test.name, test.run);
