import { Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";

import { InboxIcon } from "../icons";

/**
 * Props for {@link EmptyState}.
 *
 * @public
 */
export interface EmptyStateProps {
  /** Headline text. */
  title: string;
  /** Optional supporting description. */
  description?: string;
  /** Optional custom icon (defaults to an inbox glyph). */
  icon?: ReactNode;
  /** Optional call-to-action (e.g. a clear-filters button). */
  action?: ReactNode;
}

/**
 * Centred "nothing to show" placeholder.
 *
 * @public
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: Readonly<EmptyStateProps>) {
  return (
    <Stack
      role="status"
      align="center"
      justify="center"
      gap={6}
      py={48}
      px={16}
    >
      <Text c="dimmed" aria-hidden>
        {icon ?? <InboxIcon size={40} />}
      </Text>
      <Text fw={600} fz="md">
        {title}
      </Text>
      {description && (
        <Text c="dimmed" fz="sm" ta="center" maw={360}>
          {description}
        </Text>
      )}
      {action}
    </Stack>
  );
}
