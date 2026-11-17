/** Row count and the windowed pager, drawn by the binding with Radix Themes' controls. */
import {
  createPageButtons,
  createPager,
  type KitButtonProps,
  type KitPagerFrameProps,
  type KitRowsPerPageProps,
  mergeRefs,
} from "@adapttable/react/adapter";
import { Button as UiButton, Flex, Text as UiText } from "@radix-ui/themes";
import { forwardRef, type ReactNode } from "react";

import { subtleText } from "../styles";
import { Text } from "./kitPrimitives";
import { NativeSelect } from "./primitives";

/** Page size and range at the start, "page n of m" and the pages at the end. */
function Frame({ rowsPerPage, range, pageOf, pages }: KitPagerFrameProps) {
  "use no memo";
  return (
    <Flex gap="3" justify="between" wrap="wrap" align="center">
      <Flex gap="2" align="center">
        {rowsPerPage}
        {range}
      </Flex>
      <Flex gap="1" align="center">
        {pageOf}
        {pages}
      </Flex>
    </Flex>
  );
}

function Caption({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return (
    <UiText size="1" {...subtleText}>
      {children}
    </UiText>
  );
}

/** The page size, named by its visible caption. */
function RowsPerPage({
  label,
  value,
  options,
  onValueChange,
}: Readonly<KitRowsPerPageProps>) {
  "use no memo";
  return (
    <>
      <Caption>{label}</Caption>
      <NativeSelect
        size="1"
        width="72px"
        aria-label={label}
        value={String(value)}
        options={options.map((size) => ({
          value: String(size),
          label: String(size),
        }))}
        onValueChange={(next) => onValueChange(Number(next))}
      />
    </>
  );
}

/** A page button: soft, grey for previous and next, solid for the current page. */
const PageButton = forwardRef<HTMLButtonElement, KitButtonProps>(
  function PageButton(
    {
      elementRef,
      variant,
      tone: _tone,
      fullWidth: _fullWidth,
      justify: _justify,
      busy: _busy,
      ...rest
    },
    ref
  ) {
    "use no memo";
    return (
      <UiButton
        ref={mergeRefs(ref, elementRef)}
        type="button"
        size="1"
        variant={variant === "filled" ? "solid" : "soft"}
        color={variant === undefined ? "gray" : undefined}
        {...rest}
      />
    );
  }
);

/** The table's footer: page size, range, "page n of m" and the pages. */
export const footer = /* @__PURE__ */ createPager({
  Frame,
  RowsPerPage,
  Caption,
  // The pages sit in the frame's own row, beside "page n of m".
  Pages: /* @__PURE__ */ createPageButtons(
    { Button: PageButton, Text },
    {
      row: { display: "contents" },
      ellipsis: { paddingInline: "var(--space-1)" },
    }
  ),
});
