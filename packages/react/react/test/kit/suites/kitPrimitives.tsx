import {
  collectConformanceTests,
  type ConformanceTest,
} from "@adapttable/core/conformance";
import type { KitTriggerProps } from "@adapttable/react/adapter";
import { fireEvent, screen } from "@testing-library/react";
import { createRef } from "react";
import { expect, vi } from "vitest";

import type { ReactKitUnderTest } from "../kit";

/**
 * The shared primitives suite: each control a kit supplies to the binding
 * keeps the contract the binding draws with — its name, its presses, its
 * value, its states and the data attributes it is handed.
 *
 * @param kit - The kit under test.
 * @returns The tests, for the kit's runner to register.
 */
export function kitPrimitivesTests(
  kit: ReactKitUnderTest
): readonly ConformanceTest[] {
  const { render } = kit;
  const primitives = kit.primitives ?? {};
  return collectConformanceTests(({ describe, it }) => {
    const { Button, IconButton, TextInput, Checkbox, Text, Divider, Popover } =
      primitives;

    if (Button) {
      describe(`${kit.name} Button`, () => {
        it("presses, and takes no presses while busy or disabled", () => {
          const press = vi.fn();
          const view = render(
            <Button onClick={press} data-adapttable-part="save-button">
              Save
            </Button>
          );
          const button = screen.getByRole("button", { name: "Save" });
          expect(button).toHaveAttribute("data-adapttable-part", "save-button");
          fireEvent.click(button);
          expect(press).toHaveBeenCalledTimes(1);
          view.rerender(
            <Button onClick={press} busy>
              Save
            </Button>
          );
          fireEvent.click(screen.getByRole("button", { name: /Save/ }));
          view.rerender(
            <Button onClick={press} disabled>
              Save
            </Button>
          );
          fireEvent.click(screen.getByRole("button", { name: /Save/ }));
          expect(press).toHaveBeenCalledTimes(1);
        });

        it("hands its element to elementRef", () => {
          const ref = createRef<HTMLButtonElement>();
          render(
            <Button elementRef={ref} variant="text" tone="danger" fullWidth>
              Remove
            </Button>
          );
          expect(ref.current).toBe(
            screen.getByRole("button", { name: "Remove" })
          );
        });
      });
    }

    if (IconButton) {
      describe(`${kit.name} IconButton`, () => {
        it("is named by its label and takes no presses while busy", () => {
          const press = vi.fn();
          const view = render(
            <IconButton aria-label="Close panel" onClick={press}>
              ×
            </IconButton>
          );
          fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
          expect(press).toHaveBeenCalledTimes(1);
          view.rerender(
            <IconButton aria-label="Close panel" onClick={press} busy>
              ×
            </IconButton>
          );
          fireEvent.click(screen.getByRole("button", { name: "Close panel" }));
          expect(press).toHaveBeenCalledTimes(1);
        });
      });
    }

    if (TextInput) {
      describe(`${kit.name} TextInput`, () => {
        it("shows its value and reports each change", () => {
          const change = vi.fn();
          const ref = createRef<HTMLInputElement>();
          render(
            <TextInput
              aria-label="Search rows"
              value="Ada"
              onValueChange={change}
              elementRef={ref}
            />
          );
          const field = screen.getByRole("textbox", { name: "Search rows" });
          expect(field).toHaveValue("Ada");
          expect(ref.current).toBe(field);
          fireEvent.change(field, { target: { value: "Grace" } });
          expect(change).toHaveBeenCalledWith("Grace");
        });

        it("tells assistive technology a rejected value", () => {
          render(
            <TextInput
              aria-label="Budget"
              value="abc"
              onValueChange={() => undefined}
              invalid
            />
          );
          expect(
            screen.getByRole("textbox", { name: "Budget" })
          ).toHaveAttribute("aria-invalid", "true");
        });
      });
    }

    if (Checkbox) {
      describe(`${kit.name} Checkbox`, () => {
        it("reports the opposite state when pressed", () => {
          const change = vi.fn();
          const view = render(
            <Checkbox
              aria-label="Select row"
              checked={false}
              onCheckedChange={change}
            />
          );
          const box = screen.getByRole("checkbox", { name: "Select row" });
          expect(box).not.toBeChecked();
          fireEvent.click(box);
          expect(change).toHaveBeenLastCalledWith(true);
          view.rerender(
            <Checkbox
              aria-label="Select row"
              checked
              onCheckedChange={change}
            />
          );
          expect(
            screen.getByRole("checkbox", { name: "Select row" })
          ).toBeChecked();
          fireEvent.click(screen.getByRole("checkbox", { name: "Select row" }));
          expect(change).toHaveBeenLastCalledWith(false);
        });

        it("shows the mixed state", () => {
          render(
            <Checkbox
              aria-label="Select all"
              checked={false}
              indeterminate
              onCheckedChange={() => undefined}
            />
          );
          expect(
            screen.getByRole("checkbox", { name: "Select all" })
          ).toBePartiallyChecked();
        });

        it("is named by its visible label", () => {
          render(
            <Checkbox
              label="Show archived"
              checked={false}
              onCheckedChange={() => undefined}
              rootPart="archived-toggle"
            />
          );
          expect(
            screen.getByRole("checkbox", { name: "Show archived" })
          ).toBeInTheDocument();
        });
      });
    }

    if (Text) {
      describe(`${kit.name} Text`, () => {
        it("draws its text as the element asked for", () => {
          const { container } = render(
            <Text as="p" variant="caption" tone="secondary">
              Three rows hidden
            </Text>
          );
          expect(container.querySelector("p")).toHaveTextContent(
            "Three rows hidden"
          );
        });
      });
    }

    if (Popover) {
      describe(`${kit.name} Popover`, () => {
        const trigger = (props: KitTriggerProps) => (
          <button
            type="button"
            ref={props.elementRef}
            onClick={props.onClick}
            aria-expanded={props["aria-expanded"]}
            aria-haspopup={props["aria-haspopup"]}
            aria-controls={props["aria-controls"]}
          >
            Filters
          </button>
        );

        it("opens and closes on its own, and its trigger says so", async () => {
          render(
            <Popover
              trigger={trigger}
              part="filters-panel"
              aria-label="Filter rows"
            >
              Panel body
            </Popover>
          );
          const button = screen.getByRole("button", { name: "Filters" });
          expect(button).toHaveAttribute("aria-expanded", "false");
          expect(button).toHaveAttribute("aria-haspopup", "dialog");
          fireEvent.click(button);
          expect(await screen.findByText("Panel body")).toBeInTheDocument();
          expect(button).toHaveAttribute("aria-expanded", "true");
          expect(
            document.querySelector('[data-adapttable-part="filters-panel"]')
          ).not.toBeNull();
        });

        it("asks a controlled owner to open, and names a menu popup", async () => {
          const openChange = vi.fn();
          render(
            <Popover
              trigger={trigger}
              open={false}
              onOpenChange={openChange}
              role="menu"
              flush
            >
              Menu body
            </Popover>
          );
          const button = screen.getByRole("button", { name: "Filters" });
          expect(button).toHaveAttribute("aria-haspopup", "menu");
          fireEvent.click(button);
          await vi.waitFor(() => {
            expect(openChange).toHaveBeenCalledWith(true);
          });
          expect(button).toHaveAttribute("aria-expanded", "false");
        });
      });
    }

    if (Divider) {
      describe(`${kit.name} Divider`, () => {
        it("draws a rule carrying the data attributes it is handed", () => {
          const { container } = render(
            <Divider data-adapttable-part="menu-divider" />
          );
          expect(
            container.querySelector('[data-adapttable-part="menu-divider"]')
          ).not.toBeNull();
        });
      });
    }
  });
}
