import { it } from "vitest";

import { columnHeaderRenameTests } from "../../react/test/kit/suites/columnHeaderRename";
import { kit } from "./data-table.test-utils";

for (const test of columnHeaderRenameTests(kit)) it(test.name, test.run);
