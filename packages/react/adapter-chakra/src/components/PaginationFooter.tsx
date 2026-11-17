/** Row count and the windowed pager, drawn by the binding with Chakra's controls. */
import {
  createPageButtons,
  createPager,
  type KitPagerFrameProps,
  type KitRowsPerPageProps,
} from "@adapttable/react/adapter";
import { HStack, Text } from "@chakra-ui/react";
import type { ReactNode } from "react";

import { subtleText } from "../styles";
import { Button, Text as KitText } from "./kitPrimitives";
import { NativeSelect } from "./primitives";

/** Page size and range at the start, "page n of m" and the pages at the end. */
function Frame({ rowsPerPage, range, pageOf, pages }: KitPagerFrameProps) {
  "use no memo";
  return (
    <HStack gap={3} justify="space-between" flexWrap="wrap">
      <HStack gap={2}>
        {rowsPerPage}
        {range}
      </HStack>
      <HStack gap={1}>
        {pageOf}
        {pages}
      </HStack>
    </HStack>
  );
}

function Caption({ children }: Readonly<{ children: ReactNode }>) {
  "use no memo";
  return (
    <Text fontSize="xs" {...subtleText}>
      {children}
    </Text>
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
        size="xs"
        w="72px"
        aria-label={label}
        value={String(value)}
        onChange={(event) => onValueChange(Number(event.target.value))}
      >
        {options.map((size) => (
          <option key={size} value={String(size)}>
            {size}
          </option>
        ))}
      </NativeSelect>
    </>
  );
}

/** The table's footer: page size, range, "page n of m" and the pages. */
export const footer = /* @__PURE__ */ createPager({
  Frame,
  RowsPerPage,
  Caption,
  // The pages sit in the frame's own row, beside "page n of m".
  Pages: /* @__PURE__ */ createPageButtons(
    { Button, Text: KitText },
    { row: { display: "contents" }, ellipsis: { paddingInline: 4 } }
  ),
});
