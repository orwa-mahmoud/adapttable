/**
 * Base UI's own primitives, exercised directly.
 *
 * These are the components every other file in this kit is built from, and
 * several of their branches were reachable only through a table — which meant
 * the paths a caller reaches deliberately (`asChild`, a loading button, a
 * field with an adornment, the spacing scale) were never proven at all.
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Badge,
  Box,
  Button,
  Card,
  cx,
  Flex,
  IconButton,
  Progress,
  Separator,
  Skeleton,
  Spinner,
  Table,
  Text,
  TextField,
  VisuallyHidden,
} from "./ui";

describe("cx", () => {
  it("drops every falsy token", () => {
    expect(cx("a", undefined, false, null, "b")).toBe("a b");
    expect(cx()).toBe("");
  });
});

describe("Flex", () => {
  it("renders its children bare when asChild is set", () => {
    const { container } = render(
      <Flex asChild>
        <span data-testid="only-child">x</span>
      </Flex>
    );

    // asChild means the caller owns the element; a wrapper would break the
    // layout it was reached for.
    expect(container.querySelector(".adapttable-flex")).toBeNull();
    expect(screen.getByTestId("only-child")).toBeInTheDocument();
  });

  it("turns spacing tokens into rem and maps the alignment words", () => {
    const { container } = render(
      <Flex gap="2" py="3" mt={4} justify="between" align="center" wrap="wrap">
        <span>x</span>
      </Flex>
    );
    const el = container.querySelector<HTMLElement>(".adapttable-flex")!;

    expect(el.style.paddingBlock).toBe("0.75rem");
    expect(el.style.marginTop).toBe("1rem");
    expect(el.style.justifyContent).toBe("space-between");
    expect(el.style.alignItems).toBe("center");
    expect(el).toHaveAttribute("data-wrap", "true");
  });

  it("passes a non-numeric spacing value through untouched", () => {
    const { container } = render(
      <Flex py="1.5rem">
        <span>x</span>
      </Flex>
    );

    expect(
      container.querySelector<HTMLElement>(".adapttable-flex")!.style
        .paddingBlock
    ).toBe("1.5rem");
  });
});

describe("Box", () => {
  it("turns its spacing tokens into rem", () => {
    const { container } = render(
      <Box p="2" pt={1} mb="3" mt={0} data-testid="box">
        x
      </Box>
    );
    const el = container.querySelector<HTMLElement>('[data-testid="box"]')!;

    // Read the longhands: the browser folds padding + paddingTop into a
    // shorthand, so asserting `style.padding` would assert the folding.
    expect(el.style.paddingBottom).toBe("0.5rem");
    expect(el.style.paddingTop).toBe("0.25rem");
    expect(el.style.marginBottom).toBe("0.75rem");
    // Zero is a real value, not an absent one.
    expect(el.style.marginTop).toBe("0rem");
  });

  it("lets a caller's own style win", () => {
    const { container } = render(
      <Box p="2" style={{ padding: "9px" }} data-testid="box">
        x
      </Box>
    );

    expect(
      container.querySelector<HTMLElement>('[data-testid="box"]')!.style
        .paddingLeft
    ).toBe("9px");
  });
});

describe("Button", () => {
  it("disables itself while loading and shows it", () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole("button");

    // A loading button that can still be pressed submits twice.
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("…");
  });

  it("carries size, variant and colour as data attributes", () => {
    render(
      <Button size="1" variant="ghost" color="red">
        Delete
      </Button>
    );
    const button = screen.getByRole("button");

    expect(button).toHaveAttribute("data-size", "1");
    expect(button).toHaveAttribute("data-variant", "ghost");
    expect(button).toHaveAttribute("data-color", "red");
  });
});

describe("IconButton", () => {
  it("keeps its accessible name and its tokens", () => {
    render(
      <IconButton aria-label="Close" size="1" variant="soft" color="gray">
        ×
      </IconButton>
    );
    const button = screen.getByRole("button", { name: "Close" });

    expect(button).toHaveAttribute("data-size", "1");
    expect(button).toHaveAttribute("data-variant", "soft");
  });
});

describe("Badge", () => {
  it("renders as a span carrying its colour", () => {
    const { container } = render(<Badge color="amber">Staged</Badge>);
    const badge = container.querySelector(".adapttable-badge")!;

    expect(badge.tagName).toBe("SPAN");
    expect(badge).toHaveAttribute("data-color", "amber");
  });
});

describe("TextField", () => {
  it("is a bare input with no adornment", () => {
    const { container } = render(
      <TextField.Root aria-label="Search" size="1" />
    );

    expect(container.querySelector(".adapttable-input-wrap")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Search" })).toHaveAttribute(
      "data-size",
      "1"
    );
  });

  it("wraps the input once an adornment is given", () => {
    const { container } = render(
      <TextField.Root aria-label="Search">
        <TextField.Slot side="left">🔍</TextField.Slot>
      </TextField.Root>
    );

    expect(container.querySelector(".adapttable-input-wrap")).not.toBeNull();
    expect(screen.getByRole("textbox", { name: "Search" })).toBeInTheDocument();
    // The adornment is decoration; a screen reader should not read it.
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      "🔍"
    );
  });
});

describe("the small surfaces", () => {
  it("renders a card, a separator and hidden text", () => {
    const { container } = render(
      <>
        <Card className="mine">body</Card>
        <Separator />
        <VisuallyHidden>for screen readers</VisuallyHidden>
      </>
    );

    expect(container.querySelector(".adapttable-card")).toHaveClass("mine");
    expect(container.querySelector("hr")).toHaveClass("adapttable-separator");
    expect(
      container.querySelector(".adapttable-visually-hidden")
    ).toHaveTextContent("for screen readers");
  });

  it("sizes a skeleton from its props", () => {
    const { container } = render(<Skeleton height="12px" width={80} />);
    const el = container.querySelector<HTMLElement>(".adapttable-skeleton")!;

    expect(el.style.height).toBe("12px");
    expect(el.style.width).toBe("80px");
  });

  it("renders progress against a hundred", () => {
    const { container } = render(<Progress value={40} />);
    const el = container.querySelector<HTMLProgressElement>("progress")!;

    expect(el.value).toBe(40);
    expect(el.max).toBe(100);
  });

  it("takes the spinner's name from the caller", () => {
    // A hardcoded English name here would announce "Loading" to a reader
    // whose whole table is otherwise localized.
    render(<Spinner label="جارٍ التحميل" />);

    expect(screen.getByLabelText("جارٍ التحميل")).toBeInTheDocument();
  });

  it("renders Text as the element it was asked for", () => {
    render(
      <Text as="label" size="1">
        Column name
      </Text>
    );

    expect(screen.getByText("Column name").tagName).toBe("LABEL");
  });
});

describe("Table", () => {
  it("assembles a real table with its head, body and cells", () => {
    render(
      <Table.Root aria-label="Orders" aria-rowcount={2} aria-colcount={1}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Person</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>Ada</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>
    );

    const table = screen.getByRole("table", { name: "Orders" });
    expect(table).toHaveAttribute("aria-rowcount", "2");
    expect(table.querySelector("thead")).not.toBeNull();
    expect(table.querySelector("tbody")).not.toBeNull();
    expect(
      screen.getByRole("columnheader", { name: "Person" })
    ).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Ada" })).toBeInTheDocument();
  });
});
