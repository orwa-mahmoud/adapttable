/** The pivot configuration panel, in native HTML. */
import {
  type PivotAddProps,
  type PivotAggProps,
  type PivotFieldProps,
  PivotPanelChrome,
  type PivotPanelChromeProps,
  type PivotPanelSlots,
  type PivotPanelSurfaceProps,
  type PivotZoneProps,
} from "@adapttable/core/adapter";

/**
 * Native controls, because native IS this adapter's kit. The `<fieldset>` and
 * `<legend>` are not decoration: they are what tells a screen reader which
 * zone a field belongs to, which is the whole question this panel answers.
 */
const slots: PivotPanelSlots = {
  Surface: ({ children, className, ...rest }: PivotPanelSurfaceProps) => (
    <div className={className} {...rest}>
      {children}
    </div>
  ),
  Zone: ({ label, children, zone, ...rest }: PivotZoneProps) => (
    <fieldset data-pivot-zone={zone} {...rest}>
      <legend>{label}</legend>
      {children}
    </fieldset>
  ),
  Field: ({
    label,
    onMoveUp,
    onMoveDown,
    onRemove,
    moveUpLabel,
    moveDownLabel,
    removeLabel,
    aggregation,
    ...rest
  }: PivotFieldProps) => (
    <div {...rest}>
      <span>{label}</span>
      {aggregation}
      <button
        type="button"
        aria-label={`${moveUpLabel}: ${label}`}
        disabled={!onMoveUp}
        onClick={onMoveUp}
      >
        {"↑"}
      </button>
      <button
        type="button"
        aria-label={`${moveDownLabel}: ${label}`}
        disabled={!onMoveDown}
        onClick={onMoveDown}
      >
        {"↓"}
      </button>
      <button
        type="button"
        aria-label={`${removeLabel}: ${label}`}
        onClick={onRemove}
      >
        {"✕"}
      </button>
    </div>
  ),
  Add: ({ label, options, onAdd }: PivotAddProps) => (
    <select
      aria-label={label}
      value=""
      disabled={options.length === 0}
      onChange={(event) => {
        if (event.target.value) onAdd(event.target.value);
      }}
    >
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Agg: ({ label, value, options, onChange }: PivotAggProps) => (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => {
        onChange(event.target.value as (typeof options)[number]);
      }}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  ),
};

/**
 * Configure a pivot: three zones, and buttons that move fields between them.
 *
 * @public
 */
export function PivotPanel(
  props: Readonly<Omit<PivotPanelChromeProps, "slots">>
) {
  return <PivotPanelChrome {...props} slots={slots} />;
}
