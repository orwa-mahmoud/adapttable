import { act, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { mobileCardRegionProps } from "./mobileCardRegion";

function Scene({
  label,
  height,
}: {
  readonly label: string | undefined;
  readonly height: number | undefined;
}) {
  return (
    <>
      <button type="button">Continue</button>
      <section {...mobileCardRegionProps(label, "People", height)}>
        <ul>
          <li>Ada</li>
        </ul>
      </section>
    </>
  );
}

it("keeps a named native scroll section focusable only while bounded", () => {
  const { rerender } = render(<Scene label=" Contacts " height={240} />);
  const region = screen.getByRole("region", { name: "Contacts" });
  expect(region.tagName).toBe("SECTION");
  expect(region).toContainElement(screen.getByRole("list"));
  act(() => region.focus());
  expect(region).toHaveFocus();
  for (const label of ["", "  ", undefined]) {
    rerender(<Scene label={label} height={0} />);
    expect(screen.getByRole("region", { name: "People" })).toBe(region);
    expect(region).toHaveAttribute("tabindex", "0");
  }
  rerender(<Scene label="People" height={undefined} />);
  expect(region).not.toHaveAttribute("tabindex");
  const next = screen.getByRole("button", { name: "Continue" });
  act(() => next.focus());
  act(() => region.focus());
  expect(next).toHaveFocus();
});
