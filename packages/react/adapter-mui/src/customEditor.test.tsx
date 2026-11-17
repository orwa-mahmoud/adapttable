import { it } from "vitest";

import { customEditorTests } from "../../react/test/kit/suites/customEditor";
import { kit } from "./data-table.test-utils";

for (const test of customEditorTests(kit)) it(test.name, test.run);
