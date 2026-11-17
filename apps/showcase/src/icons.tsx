/** Tiny inline icons shared by every adapter demo's row actions. */
import { ROW_ACTION_ICON_PATHS } from "./shared/peopleActions";

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function EditIcon() {
  return <RowActionIcon action="edit" />;
}

export function TrashIcon() {
  return <RowActionIcon action="delete" />;
}

/** A row action's shared glyph. */
function RowActionIcon({ action }: Readonly<{ action: string }>) {
  return (
    <svg {...base}>
      {ROW_ACTION_ICON_PATHS[action]?.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
