import { defaultLabels } from "@adapttable/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { testPrimitives } from "../internal/testPrimitives";
import {
  createColumnHeaderRename,
  type KitRenameFieldProps,
} from "./columnRename";

const look = { root: {}, form: {}, actions: {} };
const part = (name: string) =>
  document.querySelector(`[data-adapttable-part="${name}"]`);

function mount(
  HeaderRename: ReturnType<typeof createColumnHeaderRename>,
  onRenameColumn = vi.fn()
) {
  render(
    <HeaderRename
      columnKey="a"
      name="Alpha"
      labels={defaultLabels}
      onRenameColumn={onRenameColumn}
    >
      <span data-testid="caption">Alpha</span>
    </HeaderRename>
  );
  return onRenameColumn;
}

describe("createColumnHeaderRename", () => {
  const HeaderRename = createColumnHeaderRename(
    { ...testPrimitives, editIcon: "✎" },
    () => look
  );

  it("swaps the caption for the rename form and saves the new name", async () => {
    const onRename = mount(HeaderRename);
    const button = screen.getByRole("button", {
      name: `${defaultLabels.renameColumn}: Alpha`,
    });
    fireEvent.click(button);

    expect(screen.queryByTestId("caption")).toBeNull();
    expect(button).toBeDisabled();
    const input = screen.getByLabelText(defaultLabels.columnName);
    expect(input).toHaveAttribute(
      "data-adapttable-part",
      "header-rename-input"
    );
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.change(input, { target: { value: "Owner" } });
    fireEvent.click(part("header-rename-save")!);

    expect(onRename).toHaveBeenCalledWith("a", "Owner");
    expect(screen.getByTestId("caption")).toBeInTheDocument();
    expect(part("header-rename-announcer")).toHaveTextContent("Owner");
  });

  it("names an empty draft's error on the input and keeps the caption on cancel", () => {
    const onRename = mount(HeaderRename);
    fireEvent.click(
      screen.getByRole("button", {
        name: `${defaultLabels.renameColumn}: Alpha`,
      })
    );
    const input = screen.getByLabelText(defaultLabels.columnName);
    fireEvent.change(input, { target: { value: " " } });
    fireEvent.click(part("header-rename-save")!);

    const error = part("header-rename-error");
    expect(error).toHaveTextContent(defaultLabels.columnNameRequired);
    expect(input).toHaveAttribute("aria-describedby", error?.id);
    fireEvent.click(part("header-rename-cancel")!);
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByTestId("caption")).toBeInTheDocument();
  });

  it("hands a kit's own field the header's parts", () => {
    const RenameField = vi.fn(
      ({
        id,
        elementRef,
        label,
        value,
        parts,
        onValueChange,
      }: KitRenameFieldProps) => (
        <span>
          <label htmlFor={id} data-adapttable-part={parts.label}>
            {label}
          </label>
          <input
            id={id}
            ref={elementRef}
            value={value}
            data-adapttable-part={parts.input}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </span>
      )
    );
    mount(
      createColumnHeaderRename(
        { ...testPrimitives, RenameField, editIcon: "✎" },
        () => look
      )
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: `${defaultLabels.renameColumn}: Alpha`,
      })
    );
    expect(part("header-rename-label")).toHaveTextContent(
      defaultLabels.columnName
    );
    expect(part("header-rename-input")).toBeInTheDocument();
  });
});
