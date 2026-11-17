import type { FillHandleSlotProps } from "@adapttable/angular/adapter";
import { TestBed } from "@angular/core/testing";
import { expect, it } from "vitest";

import { fillHandleTests } from "../../../angular/test/kit/suites/fillHandle";
import { kit } from "../../testing/kit";
import { AdaptFillHandleControl } from "./fillHandle";

for (const test of fillHandleTests(kit)) it(test.name, test.run);

it("stacks the handle above a Material button label that fills the cell", () => {
  const fixture = TestBed.createComponent(AdaptFillHandleControl);
  const props: FillHandleSlotProps = {
    label: "Fill from selection",
    handleProps: {},
  };
  fixture.componentRef.setInput("props", props);
  fixture.detectChanges();
  const handle = (
    fixture.nativeElement as HTMLElement
  ).querySelector<HTMLElement>('[data-adapttable-part="fill-handle"]')!;
  // Material draws its button label at z-index 1 inside the cell's editor.
  expect(Number(handle.style.zIndex)).toBeGreaterThan(1);
});
