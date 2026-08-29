import {
  defaultFilterRegistry,
  type FilterDef,
  filterLabel,
  filterOpLabel,
  type FilterTypeRegistry,
  type FilterValue,
  filterWidgetKind,
  joinRelativeToken,
  listFilterValues,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  renderRegisteredFilter,
  splitRelativeToken,
  type TableLabels,
  type TableSource,
  useBooleanFilterWidget,
  useFilterOptions,
  useRangeFilterWidget,
  useTextFilterWidget,
} from "@adapttable/core";
import {
  Autocomplete,
  CircularProgress,
  FormControl,
  FormLabel,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import type { ReactNode } from "react";

import { ChecklistFilter } from "./ChecklistFilter";

/** Above the filter popover (`zIndex: 10050`) so a MenuItem is clickable. */
const FILTER_SELECT_SLOTS = {
  native: false,
  MenuProps: { sx: { zIndex: 10051 } },
} as const;

/** The slice of the source the auto-built form reads and writes. */
type FilterBag<TRow> = Pick<
  TableSource<TRow>,
  "extra" | "setExtra" | "setExtras" | "allFilteredRows" | "facets"
>;

/** Props for `AutoFilterForm`. */
export interface AutoFilterFormProps<TRow> {
  /** The resolved declarative definitions, in render order. */
  defs: readonly FilterDef<TRow>[];
  /** The filter bag the widgets read from and write to. */
  source: FilterBag<TRow>;
  /** Resolved labels for the operator-first range widgets. */
  labels: Required<TableLabels>;
  /** Type registry; defaults to the built-ins. */
  registry?: FilterTypeRegistry;
}

/** Props for one rendered filter widget. */
interface FieldProps<TRow> {
  def: FilterDef<TRow>;
  source: FilterBag<TRow>;
}

/** Field props for the widgets that also render resolved labels. */
interface LabeledFieldProps<TRow> extends FieldProps<TRow> {
  labels: Required<TableLabels>;
}

/** A scalar filter value as input text (arrays/blanks render empty). */
function scalarText(value: FilterValue): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function TextFilter<TRow>({
  def,
  source,
  labels,
}: Readonly<LabeledFieldProps<TRow>>) {
  const { label, ops, opLabelKeys, op, value, needsValue, write } =
    useTextFilterWidget(def, source);
  return (
    <FormControl component="fieldset" variant="standard" sx={{ width: "100%" }}>
      <FormLabel component="legend" sx={{ mb: 3 }}>
        {label}
      </FormLabel>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <TextField
          select
          size="small"
          value={op}
          onChange={(e) => {
            const next = ops.find((choice) => choice === e.target.value);
            if (next) write(next, value);
          }}
          data-adapttable-part="filter-operator"
          slotProps={{
            select: FILTER_SELECT_SLOTS,
            htmlInput: { "aria-label": labels.operator },
          }}
          sx={{ flex: "0 0 8.5rem", width: "8.5rem" }}
        >
          {ops.map((choice) => (
            <MenuItem key={choice} value={choice}>
              {filterOpLabel(labels, opLabelKeys[choice])}
            </MenuItem>
          ))}
        </TextField>
        {needsValue && (
          <TextField
            size="small"
            placeholder={def.placeholder}
            value={value}
            onChange={(e) => write(op, e.target.value)}
            slotProps={{
              htmlInput: {
                "aria-label": labels.value,
                "data-adapttable-part": "filter-input",
              },
            }}
            sx={{ flex: "1 1 7rem", minWidth: "7rem" }}
          />
        )}
      </Stack>
    </FormControl>
  );
}

function BooleanFilter<TRow>({
  def,
  source,
  labels,
}: Readonly<LabeledFieldProps<TRow>>) {
  const { label, choice, write } = useBooleanFilterWidget(def, source);
  return (
    <TextField
      select
      size="small"
      label={label}
      value={choice}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "" || next === "true" || next === "false") write(next);
      }}
      data-adapttable-part="filter-select"
      slotProps={{
        select: FILTER_SELECT_SLOTS,
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem value="">{labels.boolAny}</MenuItem>
      <MenuItem value="true">{labels.boolTrue}</MenuItem>
      <MenuItem value="false">{labels.boolFalse}</MenuItem>
    </TextField>
  );
}

function SelectFilter<TRow>({ def, source }: Readonly<FieldProps<TRow>>) {
  // The options source may be an array OR an async loader — never map it
  // directly. The hook resolves both (and reports loader progress).
  const { options, loading } = useFilterOptions(def);
  return (
    <TextField
      select
      size="small"
      label={filterLabel(def)}
      value={scalarText(source.extra[def.key])}
      onChange={(e) => source.setExtra(def.key, e.target.value)}
      slotProps={{
        select: FILTER_SELECT_SLOTS,
        inputLabel: { shrink: true },
      }}
    >
      <MenuItem value="">All</MenuItem>
      {loading && (
        <MenuItem value="" disabled>
          …
        </MenuItem>
      )}
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}

function MultiSelectFilter<TRow>({ def, source }: Readonly<FieldProps<TRow>>) {
  const label = filterLabel(def);
  const { options, loading } = useFilterOptions(def);
  const selected = listFilterValues(source.extra[def.key]);
  const chosen = options.filter((option) => selected.includes(option.value));
  return (
    <>
      {loading ? <CircularProgress color="inherit" size={16} /> : null}
      <Autocomplete
        multiple
        options={[...options]}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(left, right) => left.value === right.value}
        value={chosen}
        onChange={(_, next) =>
          source.setExtra(
            def.key,
            next.map((option) => option.value)
          )
        }
        loading={loading}
        slotProps={{
          listbox: { style: { maxHeight: 240, overflow: "auto" } },
        }}
        renderInput={(params) => (
          <TextField {...params} size="small" label={label} />
        )}
      />
    </>
  );
}

function RelativeTokenField({
  labels,
  value,
  onValue,
}: Readonly<{
  labels: Required<TableLabels>;
  value: string;
  onValue: (next: string) => void;
}>) {
  const { preset, n } = splitRelativeToken(value);
  const counted = preset === "last" || preset === "next";
  return (
    <>
      <TextField
        select
        size="small"
        value={preset}
        onChange={(e) => {
          const found = RELATIVE_PRESETS.find((p) => p === e.target.value);
          if (found) onValue(joinRelativeToken(found, n));
        }}
        slotProps={{
          select: FILTER_SELECT_SLOTS,
          htmlInput: { "aria-label": labels.opRelative },
        }}
        sx={{ flex: "1 1 8.5rem", minWidth: "8.5rem" }}
      >
        {RELATIVE_PRESETS.map((p) => (
          <MenuItem key={p} value={p}>
            {labels[RELATIVE_PRESET_LABEL_KEYS[p]]}
          </MenuItem>
        ))}
      </TextField>
      {counted && (
        <TextField
          size="small"
          type="number"
          value={n}
          onChange={(e) =>
            onValue(joinRelativeToken(preset, Number(e.target.value)))
          }
          slotProps={{
            htmlInput: { min: 1, "aria-label": labels.value },
          }}
          sx={{ flex: "0 0 4.5rem", width: "4.5rem" }}
        />
      )}
    </>
  );
}

/**
 * Operator-first range widget: a comparison select, then one value input —
 * or a From/To pair for "between". The operator is persisted as `f_<key>Op`.
 */
function RangeFilter<TRow>({
  def,
  source,
  labels,
}: Readonly<LabeledFieldProps<TRow>>) {
  const { label, ops, opLabelKeys, inputType, arity, op, setOp, a, b, write } =
    useRangeFilterWidget(def, source);
  const boundType = inputType === "text" ? "text" : inputType;
  const input = (
    caption: string,
    value: string,
    commit: (raw: string) => void
  ) => (
    <TextField
      size="small"
      sx={{ flex: "1 1 7rem", minWidth: "7rem" }}
      type={boundType}
      placeholder={caption}
      value={value}
      onChange={(e) => commit(e.target.value)}
      slotProps={{ htmlInput: { "aria-label": caption } }}
    />
  );
  let bounds: ReactNode = null;
  if (arity === "two") {
    bounds = (
      <>
        {input(labels.from, a, (raw) => write(op, raw, b))}
        {input(labels.to, b, (raw) => write(op, a, raw))}
      </>
    );
  } else if (op === "relative") {
    bounds = (
      <RelativeTokenField
        labels={labels}
        value={a}
        onValue={(raw) => write(op, raw, "")}
      />
    );
  } else if (op !== undefined && arity !== "none") {
    bounds = input(labels.value, a, (raw) => write(op, raw, ""));
  }
  return (
    <FormControl component="fieldset" variant="standard" sx={{ width: "100%" }}>
      <FormLabel component="legend" sx={{ mb: 3 }}>
        {label}
      </FormLabel>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
        <TextField
          select
          size="small"
          value={op ?? ""}
          onChange={(e) => {
            const next = ops.find((candidate) => candidate === e.target.value);
            setOp(next);
            write(next, a, b);
          }}
          data-adapttable-part="filter-operator"
          slotProps={{
            select: FILTER_SELECT_SLOTS,
            htmlInput: { "aria-label": labels.operator },
          }}
          sx={{ flex: "0 0 8.5rem", width: "8.5rem" }}
        >
          <MenuItem value="" />
          {ops.map((candidate) => (
            <MenuItem key={candidate} value={candidate}>
              {filterOpLabel(
                labels,
                opLabelKeys[candidate as keyof typeof opLabelKeys]
              )}
            </MenuItem>
          ))}
        </TextField>
        {bounds}
      </Stack>
    </FormControl>
  );
}

function FilterField<TRow>({
  def,
  source,
  labels,
  registry,
}: Readonly<LabeledFieldProps<TRow> & { registry: FilterTypeRegistry }>) {
  const custom = renderRegisteredFilter(def, source, labels, registry);
  if (custom) return custom;
  switch (filterWidgetKind(def, registry)) {
    case "text":
      return <TextFilter def={def} source={source} labels={labels} />;
    case "boolean":
      return <BooleanFilter def={def} source={source} labels={labels} />;
    case "select":
      return <SelectFilter def={def} source={source} />;
    case "multiSelect":
      return <MultiSelectFilter def={def} source={source} />;
    case "checklist":
      return <ChecklistFilter def={def} source={source} labels={labels} />;
    case "dateRange":
    case "numberRange":
      return <RangeFilter def={def} source={source} labels={labels} />;
    default:
      return null;
  }
}

/**
 * The auto-built filter form: one MUI widget per declarative definition,
 * reading and writing the source's extra-filter bag (so chips, URL state
 * and — on frontend data — the row predicate all stay in sync). Operator
 * and value share a row; MUI selects stay inline inside the popover.
 *
 * @typeParam TRow - The row type.
 */
export function AutoFilterForm<TRow>({
  defs,
  source,
  labels,
  registry = defaultFilterRegistry,
}: Readonly<AutoFilterFormProps<TRow>>) {
  return (
    <Stack spacing={3}>
      {defs.map((def) => (
        <FilterField
          key={def.key}
          def={def}
          source={source}
          labels={labels}
          registry={registry}
        />
      ))}
    </Stack>
  );
}
