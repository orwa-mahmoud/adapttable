/** The card list, drawn by the binding with native list items. */
import {
  createMobileCards,
  type KitCardRegions,
  type KitCardSelectProps,
  type KitCardsLook,
  type KitCardTextProps,
  type KitSummaryField,
} from "@adapttable/react/adapter";
import type { CSSProperties, LiHTMLAttributes, ReactNode } from "react";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import {
  useClassNames,
  useClassOfPart,
  usePartClass,
} from "./classNamesContext";
import { RowActionButtons } from "./RowActionButtons";

/** A card's regions in reading order, straight inside the list item. */
function CardFrame({
  tree,
  select,
  expand,
  body,
  reorder,
  rowEdit,
  actions,
  detail,
}: Readonly<KitCardRegions>) {
  "use no memo";
  return (
    <>
      {tree}
      {select}
      {expand}
      {body}
      {reorder}
      {rowEdit}
      {actions}
      {detail}
    </>
  );
}

function FieldLabel({
  labelled: _labelled,
  ...rest
}: Readonly<KitCardTextProps>) {
  "use no memo";
  return <span className={useClassNames().cardLabel} {...rest} />;
}

function FieldValue({
  labelled: _labelled,
  ...rest
}: Readonly<KitCardTextProps>) {
  "use no memo";
  return <span className={useClassNames().cardValue} {...rest} />;
}

const SELECT_TARGET: CSSProperties = {
  display: "inline-flex",
  minWidth: 44,
  minHeight: 44,
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

/** The row's checkbox inside a 44 px label, so the whole target toggles it. */
function Select({
  checked,
  onToggle,
  "aria-label": label,
}: Readonly<KitCardSelectProps>) {
  "use no memo";
  return (
    <label style={SELECT_TARGET}>
      <input
        type="checkbox"
        data-adapttable-part="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onToggle}
        className={useClassNames().checkbox}
      />
    </label>
  );
}

const BLOCK: CSSProperties = { display: "block" };

/** The totals, after the cards, with a row for each column that has one. */
function SummaryCard({
  fields,
}: Readonly<{ fields: readonly KitSummaryField[]; compact: boolean }>) {
  "use no memo";
  const classNames = useClassNames();
  return (
    <li
      data-adapttable-part="summary-card"
      className={cx(classNames.card, classNames.summaryCard)}
      style={BLOCK}
    >
      {fields.map(({ key, label, value }) =>
        value == null ? null : (
          <div
            key={key}
            data-adapttable-part="card-row"
            className={classNames.cardRow}
          >
            {label && (
              <span
                data-adapttable-part="card-label"
                className={classNames.cardLabel}
              >
                {label}
              </span>
            )}
            <span
              data-adapttable-part="card-value"
              className={classNames.cardValue}
            >
              {value}
            </span>
          </div>
        )
      )}
    </li>
  );
}

const LOOK: KitCardsLook = {
  grid: () => ({
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 7rem), 1fr))",
    gap: "0.75rem",
    minWidth: 0,
  }),
  field: (labelled) => ({
    minWidth: 0,
    overflowWrap: "anywhere",
    gridColumn: labelled ? undefined : "1 / -1",
  }),
  actions: {},
  detail: {},
};

const useLook = (): KitCardsLook => LOOK;

/** The cell of an extra row, with the class of its part. */
function ExtraCell({
  part,
  children,
}: Readonly<{ part: string; children: ReactNode }>) {
  "use no memo";
  return (
    <div data-adapttable-part={part} className={useClassOfPart(part)}>
      {children}
    </div>
  );
}

/**
 * A list item; one the binding gave no class (an extra row) takes the class
 * of its part.
 */
function CardHost({
  className,
  ...rest
}: Readonly<
  LiHTMLAttributes<HTMLLIElement> & { "data-adapttable-part"?: string }
>) {
  "use no memo";
  const own = useClassOfPart(rest["data-adapttable-part"]);
  return <li className={className ?? own} {...rest} />;
}

const HOSTS = { Card: CardHost };

/** The kit's own card props: the class map rides with the table. */
interface UnstyledCardsProps {
  readonly classNames: DataTableClassNames;
}

/** Mobile card-list rendering. */
export const MobileCards =
  /* @__PURE__ */ createMobileCards<UnstyledCardsProps>({
    CardFrame,
    FieldLabel,
    FieldValue,
    Select,
    RowActions: RowActionButtons,
    SummaryCard,
    summaryPlacement: "after-list",
    useLook,
    usePartClass,
    compact: () => false,
    cardProps: (entry, { classNames }) => ({
      // The native list item is already a list item.
      role: undefined,
      style: { display: "block", ...entry.itemProps.style },
      "data-clickable": entry.body.onRowClick === undefined ? undefined : "",
      className: cx(classNames.card, entry.rowClass),
    }),
    extraCell: (part, content) => <ExtraCell part={part}>{content}</ExtraCell>,
    extraProps: (kind) => ({
      // A full-width row is a native list item already.
      role: kind === "separator" ? "separator" : undefined,
      className: undefined,
      style: BLOCK,
    }),
    groupProps: {
      "data-adapttable-part": undefined,
      className: undefined,
      style: BLOCK,
    },
    useChrome: (props) => ({
      hosts: HOSTS,
      classNames: { ...props.classNames },
      dir: props.table.getTableProps().dir,
      listProps: props.table.getTableProps({ role: undefined }),
    }),
  });
