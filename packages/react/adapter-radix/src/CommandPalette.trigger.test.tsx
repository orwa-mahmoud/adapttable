import { it } from "vitest";

import { commandPaletteTriggerTests } from "../../react/test/kit/suites/commandPaletteTrigger";
import { kit } from "./data-table.test-utils";

for (const test of commandPaletteTriggerTests(kit)) it(test.name, test.run);
