import {
  CHECKLIST_LIST_HEIGHT,
  filterOpLabel,
  listFilterValues,
  scalarFilterText,
  useBooleanFilterWidget,
  useFilterOptions,
  useRangeFilterWidget,
  useTextFilterWidget,
} from "@adapttable/react";
import {
  defaultFilterRegistry,
  type Direction,
  FILTER_LABELS,
  type FilterDef,
  type FilterFormSource,
  filterLabel,
  type FilterTypeRegistry,
  type FilterWidget,
  FilterWidgetField,
  type FilterWidgetProps,
  joinRelativeToken,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  resolveTableLabels,
  splitRelativeToken,
  type TableLabels,
} from "@adapttable/react/adapter";
import {
  Checkbox,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { type ReactNode, useId } from "react";

import { ChecklistFilter } from "./ChecklistFilter";
import { FormField, NativeSelect } from "./primitives";

const FORM_LABELS = [FILTER_LABELS];

/**
 * A labelled GROUP wrapper for multi-control fields (the multiSelect checkbox
 * group). Unlike `FormField` it does NOT use Ark's `Field.Root`, whose
 * single-control labelling would hijack the first checkbox's id and name. The
 * label carries an `id` so the group references it via `aria-labelledby`.
 */
function GroupField({
  label,
  id,
  children,
}: Readonly<{ label: ReactNode; id: string; children: ReactNode }>) {
  "use no memo";
  return (
    <Stack gap={4} data-adapttable-part="filter-field">
      <Text id={id} as="span" fontSize="sm">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

/** Props for `AutoFilterForm`. */
export interface AutoFilterFormProps<TRow> {
  /** Writing direction (flips the select chevron). */
  dir?: Direction;
  /** The resolved filter definitions, in render order. */
  defs: readonly FilterDef<TRow>[];
  /** The resolved table source (filter bag + setters). */
  source: FilterFormSource<TRow>;
  /** Chakra color scheme for option checkboxes. */
  accentColor?: string;
  /** Pre-translated label overrides (operator names, From/To, …). */
  labels?: TableLabels;
  /** Type registry; defaults to the built-ins. */
  registry?: FilterTypeRegistry;
}

/** Preset select + optional N for last/next. Stores the token. */
function RelativeTokenField({
  labels,
  value,
  onValue,
}: Readonly<{
  labels: Required<TableLabels>;
  value: string;
  onValue: (next: string) => void;
}>) {
  "use no memo";
  const { preset, n } = splitRelativeToken(value);
  const counted = preset === "last" || preset === "next";
  return (
    <>
      <NativeSelect
        size="sm"
        flex="1 1 8.5rem"
        minW="8.5rem"
        aria-label={labels.opRelative}
        value={preset}
        onChange={(e) => {
          const next = RELATIVE_PRESETS.find((p) => p === e.target.value);
          if (next) onValue(joinRelativeToken(next, n));
        }}
      >
        {RELATIVE_PRESETS.map((p) => (
          <option key={p} value={p}>
            {labels[RELATIVE_PRESET_LABEL_KEYS[p]]}
          </option>
        ))}
      </NativeSelect>
      {counted && (
        <Input
          size="sm"
          flex="0 0 4.5rem"
          w="4.5rem"
          type="number"
          min={1}
          aria-label={labels.value}
          value={n}
          onChange={(e) =>
            onValue(joinRelativeToken(preset, Number(e.target.value)))
          }
        />
      )}
    </>
  );
}

/**
 * Operator-first range widget (`numberRange` / `dateRange`): a comparison
 * select, then ONE bound input — or a From/To pair for "Between". The widget
 * logic (operator seeding, bound derivation, writes) lives in core's
 * `useRangeFilterWidget`; this renders the Chakra controls over it.
 */
function RangeField<TRow>({
  def,
  source,
  labels,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
}>) {
  "use no memo";
  const id = useId();
  const { label, ops, opLabelKeys, inputType, arity, op, setOp, a, b, write } =
    useRangeFilterWidget(def, source);
  return (
    <FormField label={label} data-adapttable-part="filter-field">
      {/* Operator and value(s) share ONE row — it reads like a sentence:
          "At least [5]". */}
      <HStack gap={2} align="flex-start" flexWrap="wrap" rowGap={2}>
        {/* Chakra renders `placeholder` as the empty first option, so the
            operator placeholder doubles as the "no comparison" clear choice. */}
        <NativeSelect
          size="sm"
          flex="0 0 8.5rem"
          w="8.5rem"
          aria-label={labels.operator}
          data-adapttable-part="filter-operator"
          placeholder={labels.operator}
          value={op ?? ""}
          onChange={(e) => {
            const next = ops.find((o) => o === e.target.value);
            setOp(next);
            write(next, a, b);
          }}
        >
          {ops.map((o) => (
            <option key={o} value={o}>
              {filterOpLabel(
                labels,
                opLabelKeys[o as keyof typeof opLabelKeys]
              )}
            </option>
          ))}
        </NativeSelect>
        {arity === "two" && (
          <>
            <Input
              id={`${id}-a`}
              size="sm"
              flex="1 1 7rem"
              minW="7rem"
              type={inputType}
              aria-label={labels.from}
              placeholder={labels.from}
              value={a}
              onChange={(e) => write(op, e.target.value, b)}
            />
            <Input
              id={`${id}-b`}
              size="sm"
              flex="1 1 7rem"
              minW="7rem"
              type={inputType}
              aria-label={labels.to}
              placeholder={labels.to}
              value={b}
              onChange={(e) => write(op, a, e.target.value)}
            />
          </>
        )}
        {op === "relative" && (
          <RelativeTokenField
            labels={labels}
            value={a}
            onValue={(next) => write(op, next, "")}
          />
        )}
        {op !== undefined &&
          op !== "relative" &&
          arity !== "none" &&
          arity !== "two" && (
            <Input
              id={`${id}-a`}
              size="sm"
              flex="1 1 7rem"
              minW="7rem"
              type={inputType}
              aria-label={labels.value}
              placeholder={labels.value}
              value={a}
              onChange={(e) => write(op, e.target.value, "")}
            />
          )}
      </HStack>
    </FormField>
  );
}

/** Operator-first text filter: comparison select, then the term (if needed). */
function TextFilterField<TRow>({
  def,
  source,
  labels,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
}>) {
  "use no memo";
  const { label, ops, opLabelKeys, op, value, needsValue, write } =
    useTextFilterWidget(def, source);
  return (
    <FormField label={label} data-adapttable-part="filter-field">
      <HStack gap={2} align="flex-start" flexWrap="wrap" rowGap={2}>
        <NativeSelect
          size="sm"
          flex="0 0 8.5rem"
          w="8.5rem"
          aria-label={labels.operator}
          data-adapttable-part="filter-operator"
          value={op}
          onChange={(e) => {
            const found = ops.find((choice) => choice === e.target.value);
            if (found) write(found, value);
          }}
        >
          {ops.map((choice) => (
            <option key={choice} value={choice}>
              {filterOpLabel(labels, opLabelKeys[choice])}
            </option>
          ))}
        </NativeSelect>
        {needsValue && (
          <Input
            size="sm"
            flex="1 1 7rem"
            minW="7rem"
            aria-label={label}
            data-adapttable-part="filter-input"
            value={value}
            placeholder={def.placeholder}
            onChange={(e) => write(op, e.target.value)}
          />
        )}
      </HStack>
    </FormField>
  );
}

/** Tri-state boolean: Any / True / False — never a checkbox. */
function BooleanFilterField<TRow>({
  def,
  source,
  labels,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
}>) {
  "use no memo";
  const { label, choice, write } = useBooleanFilterWidget(def, source);
  return (
    <FormField label={label} data-adapttable-part="filter-field">
      <NativeSelect
        size="sm"
        aria-label={label}
        data-adapttable-part="filter-select"
        value={choice}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "" || next === "true" || next === "false") write(next);
        }}
      >
        <option value="">{labels.boolAny}</option>
        <option value="true">{labels.boolTrue}</option>
        <option value="false">{labels.boolFalse}</option>
      </NativeSelect>
    </FormField>
  );
}

function SelectFilterField<TRow>({
  def,
  source,
  labels,
}: Readonly<FilterWidgetProps<TRow>>) {
  "use no memo";
  // Static arrays resolve instantly; async loaders run once and report
  // `loading` so the select shows a native affordance.
  const { options, loading } = useFilterOptions(def);
  return (
    <FormField label={filterLabel(def)} data-adapttable-part="filter-field">
      <NativeSelect
        size="sm"
        data-adapttable-part="filter-select"
        value={scalarFilterText(source.extra[def.key])}
        onChange={(e) => source.setExtra(def.key, e.target.value)}
      >
        {loading ? (
          <option value="" disabled>
            …
          </option>
        ) : (
          <>
            <option value="">{labels.filterAll}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </>
        )}
      </NativeSelect>
    </FormField>
  );
}

function MultiSelectFilterField<TRow>({
  def,
  source,
  accentColor,
}: Readonly<FilterWidgetProps<TRow> & { accentColor?: string }>) {
  "use no memo";
  const id = useId();
  const { options, loading } = useFilterOptions(def);
  const selected = listFilterValues(source.extra[def.key]);
  const toggle = (value: string) =>
    source.setExtra(
      def.key,
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  return (
    <GroupField label={filterLabel(def)} id={id}>
      {loading ? (
        <Spinner size="xs" />
      ) : (
        <HStack
          gap={2}
          flexWrap="wrap"
          align="flex-start"
          role="group"
          aria-labelledby={id}
          maxH={`${CHECKLIST_LIST_HEIGHT}px`}
          overflowY="auto"
        >
          {options.map((option, index) => (
            <Checkbox.Root
              key={option.value}
              id={`${id}-${index}`}
              size="sm"
              colorPalette={accentColor}
              value={option.value}
              checked={selected.includes(option.value)}
            >
              <Checkbox.HiddenInput onClick={() => toggle(option.value)} />
              <Checkbox.Control />
              <Checkbox.Label>{option.label}</Checkbox.Label>
            </Checkbox.Root>
          ))}
        </HStack>
      )}
    </GroupField>
  );
}

/** The Chakra text filter: its operator and its value. @public */
export const textFilterWidget: FilterWidget = {
  kinds: ["text"],
  render: TextFilterField,
};
/** The Chakra yes/no filter. @public */
export const booleanFilterWidget: FilterWidget = {
  kinds: ["boolean"],
  render: BooleanFilterField,
};
/** The Chakra single-choice filter. @public */
export const selectFilterWidget: FilterWidget = {
  kinds: ["select"],
  render: SelectFilterField,
};
/** The Chakra multiple-choice filter. @public */
export const multiSelectFilterWidget: FilterWidget = {
  kinds: ["multiSelect"],
  render: MultiSelectFilterField,
};
/** The Chakra searchable checklist filter. @public */
export const checklistFilterWidget: FilterWidget = {
  kinds: ["checklist"],
  render: ChecklistFilter,
};
/** The Chakra operator-first number and date range filter. @public */
export const rangeFilterWidget: FilterWidget = {
  kinds: ["dateRange", "numberRange"],
  render: RangeField,
};
/** Every built-in widget: what the automatic filters form draws. */
export const FILTER_WIDGETS: readonly FilterWidget[] = [
  textFilterWidget,
  booleanFilterWidget,
  selectFilterWidget,
  multiSelectFilterWidget,
  checklistFilterWidget,
  rangeFilterWidget,
];

/** Props for `FilterFields`. */
export interface FilterFieldsProps {
  /** The resolved filter definitions, in render order. */
  readonly defs: readonly FilterDef<unknown>[];
  /** The filter bag the widgets read from and write to. */
  readonly source: FilterFormSource<unknown>;
  /** Resolved labels for every control. */
  readonly labels: Required<TableLabels>;
  /** Chakra color scheme for option checkboxes. */
  readonly accentColor?: string;
  /** Type registry that names each definition's widget. */
  readonly registry: FilterTypeRegistry;
  /** The widgets the fields are drawn with. */
  readonly widgets: readonly FilterWidget[];
}

/** One field per definition, drawn with the given widgets. */
export function FilterFields({
  defs,
  source,
  labels,
  accentColor,
  registry,
  widgets,
}: Readonly<FilterFieldsProps>) {
  // Every field reads the live source, so a cache would miss on each change.
  "use no memo";
  // The kit's own extras ride along; widgets that draw them read them.
  const field = (def: FilterDef<unknown>): FilterWidgetProps => {
    const props = { def, source, labels, accentColor };
    return props;
  };
  return (
    <Stack gap={6}>
      {defs.map((def) => (
        <FilterWidgetField
          key={def.key}
          field={field(def)}
          registry={registry}
          widgets={widgets}
        />
      ))}
    </Stack>
  );
}

/**
 * The auto-built filter form: one kit-native Chakra control per declarative
 * `FilterDef`, reading and writing the source's extra-filter bag —
 * `""` / `[]` clears a key. Rendered inside the filter popover or drawer
 * when the `filters` prop is the declarative array form.
 *
 * @typeParam TRow - The row type.
 */
export function AutoFilterForm<TRow>({
  defs,
  source,
  accentColor,
  labels,
  registry = defaultFilterRegistry,
}: Readonly<AutoFilterFormProps<TRow>>) {
  "use no memo";
  return (
    <FilterFields
      defs={defs}
      source={source}
      labels={resolveTableLabels(labels, FORM_LABELS)}
      accentColor={accentColor}
      registry={registry}
      widgets={FILTER_WIDGETS}
    />
  );
}
