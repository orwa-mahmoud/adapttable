import type { TableLabels } from "@adapttable/core";
import { Button } from "antd";
import type { MouseEventHandler } from "react";

import { ChevronRightIcon } from "../icons";

/**
 * The chevron that opens/closes a row's detail panel — shared by the desktop
 * table's `expandable.expandIcon` and the mobile cards. A real button carrying
 * `aria-expanded` plus the `labels.expandRow` / `labels.collapseRow` contract;
 * antd's built-in expand icon reads its ConfigProvider locale instead, which
 * would ignore caller label overrides and the `@adapttable/i18n` locales.
 */
export function ExpandToggle({
  expanded,
  labels,
  onClick,
}: Readonly<{
  expanded: boolean;
  labels: Pick<Required<TableLabels>, "expandRow" | "collapseRow">;
  onClick: MouseEventHandler<HTMLElement>;
}>) {
  return (
    <Button
      type="text"
      size="small"
      aria-expanded={expanded}
      aria-label={expanded ? labels.collapseRow : labels.expandRow}
      onClick={onClick}
      icon={
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            transition: "transform 0.2s",
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          <ChevronRightIcon size={14} />
        </span>
      }
    />
  );
}
