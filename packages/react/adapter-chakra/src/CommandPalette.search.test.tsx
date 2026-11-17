import { it } from "vitest";

import { commandPaletteSearchTests } from "../../react/test/kit/suites/commandPaletteSearch";
import { kit } from "./data-table.test-utils";

for (const test of commandPaletteSearchTests(kit)) it(test.name, test.run);
