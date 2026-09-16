/** Selection bar with the bulk actions and cross-page banner. */
import {
  type BulkBarChromeProps,
  resolveDisabledReason,
  useBulkBarState,
} from "@adapttable/react/adapter";
import { isValidElement } from "react";

import type { BaseUiAccentColor } from "../types";
import { Button, Flex, Text } from "../ui";
import { Tooltip } from "./primitives";

/** Selection toolbar. */
export function BulkBar({
  selection,
  total,
  bulkActions,
  confirm,
  labels,
  accentColor,
}: Readonly<BulkBarChromeProps & { accentColor?: BaseUiAccentColor }>) {
  const {
    selectedCount,
    ids,
    pending,
    errorMessage,
    run,
    clear,
    expandable,
    scope,
    banner,
  } = useBulkBarState({ selection, total, confirm, labels });
  if (selectedCount === 0) return null;
  return (
    <Flex
      data-adapttable-part="bulk-bar"
      gap="2"
      justify="between"
      wrap="wrap"
      align="center"
    >
      {expandable ? (
        <Flex
          data-adapttable-part="select-all-banner"
          gap="2"
          wrap="wrap"
          align="center"
        >
          <Text data-adapttable-part="select-all-text" size="2">
            {banner.text}
          </Text>
          <Button
            data-adapttable-part="select-all-button"
            size="1"
            variant="ghost"
            color={accentColor}
            disabled={pending !== null}
            onClick={banner.onClick}
          >
            {banner.action}
          </Button>
        </Flex>
      ) : (
        <Text size="2">{labels.selectedCount(selectedCount)}</Text>
      )}
      <Flex gap="2" wrap="wrap" align="center">
        <Button
          size="1"
          variant="ghost"
          color="gray"
          onClick={clear}
          disabled={pending !== null}
        >
          {labels.clearAll}
        </Button>
        {bulkActions.map((action) => {
          const reason = resolveDisabledReason(action.disabledReason?.(ids));
          return (
            <Tooltip key={action.key} label={reason ?? ""} disabled={!reason}>
              <Button
                data-adapttable-part="bulk-button"
                size="1"
                color={action.color ?? accentColor}
                disabled={reason !== undefined || pending !== null}
                onClick={() => run(action, ids, scope)}
              >
                {isValidElement(action.icon) ? action.icon : null}
                {action.label}
              </Button>
            </Tooltip>
          );
        })}
        {errorMessage !== null && (
          <Text
            data-adapttable-part="bulk-error"
            size="2"
            color="red"
            role="alert"
          >
            {`${labels.errorTitle}: ${errorMessage}`}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
