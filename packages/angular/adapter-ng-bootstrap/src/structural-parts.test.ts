import { it } from "vitest";

import { structuralPartsTests } from "../../angular/test/kit/suites/structuralParts";
import { kit } from "../testing/kit";

for (const test of structuralPartsTests(kit)) it(test.name, test.run);
