import { it } from "vitest";

import { kitControlsKeyboardTests } from "../../../react/test/kit/suites/kitControlsKeyboard";
import { kit } from "../data-table.test-utils";

for (const test of kitControlsKeyboardTests(kit)) it(test.name, test.run);
