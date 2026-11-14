/**
 * The formulas page, written once for React, Vue and Angular: the columns it
 * starts with, the one-click examples (two of which go wrong on purpose),
 * how a typed formula gets its key, and what the report says. A framework
 * adds only its formula bar's markup and its binding's formula state.
 */
import type { FormulaColumnSpec } from "@adapttable/core/formula";

/** Where the page starts: two columns nobody wrote code for. */
export const FORMULA_START: readonly FormulaColumnSpec[] = [
  { key: "margin", header: "Margin", formula: "=ROUND(budget * 0.15, 0)" },
  { key: "tag", header: "Tag", formula: '=UPPER(team) & " · " & role' },
];

/**
 * One click each, including the two that go wrong on purpose: an error
 * belongs in the cell that caused it, and a cycle has to be reported rather
 * than recursed into.
 */
export const FORMULA_EXAMPLES: readonly {
  readonly label: string;
  readonly specs: readonly FormulaColumnSpec[];
}[] = [
  {
    label: "=ROUND(budget / 12, 0)",
    specs: [
      {
        key: "monthly",
        header: "Per month",
        formula: "=ROUND(budget / 12, 0)",
      },
    ],
  },
  {
    label: '=IF(utilization > 80, "over", "ok")',
    specs: [
      {
        key: "capacity",
        header: "Capacity",
        formula: '=IF(utilization > 80, "over", "ok")',
      },
    ],
  },
  {
    label: "=UPPER(name)",
    specs: [{ key: "shout", header: "Shouted", formula: "=UPPER(name)" }],
  },
  {
    label: "=POWER(2, 3)",
    specs: [{ key: "power", header: "Power", formula: "=POWER(2, 3)" }],
  },
  {
    label: "=SQRT(budget)",
    specs: [
      { key: "root", header: "Root", formula: "=ROUND(SQRT(budget), 0)" },
    ],
  },
  {
    label: "=budget / 0 → #DIV/0!",
    specs: [{ key: "broken", header: "Broken", formula: "=budget / 0" }],
  },
  {
    label: "two formulas in a loop → #CYCLE!",
    specs: [
      { key: "loop", header: "Loop", formula: "=knot + 1" },
      { key: "knot", header: "Knot", formula: "=loop + 1" },
    ],
  },
];

/** A column key a formula can reference: a bare name, as the grammar takes it. */
function formulaKeyFrom(
  name: string,
  taken: readonly FormulaColumnSpec[]
): string {
  const slug = name.replaceAll(/\W/g, "");
  if (slug !== "" && !taken.some((spec) => spec.key === slug)) return slug;
  let n = taken.length + 1;
  while (taken.some((spec) => spec.key === `fx${String(n)}`)) n++;
  return `fx${String(n)}`;
}

/**
 * The list with `specs` added, skipping any whose key is already there.
 *
 * @param formulas - The current formulas.
 * @param specs - The formulas to add.
 * @returns The new list, or the same list when nothing was new.
 */
export function withFormulas(
  formulas: readonly FormulaColumnSpec[],
  specs: readonly FormulaColumnSpec[]
): readonly FormulaColumnSpec[] {
  const fresh = specs.filter(
    (spec) => !formulas.some((existing) => existing.key === spec.key)
  );
  return fresh.length > 0 ? [...formulas, ...fresh] : formulas;
}

/**
 * The list with the formula the reader typed added under the name they gave
 * it, or under a generated key.
 *
 * @param formulas - The current formulas.
 * @param name - The column name typed, possibly empty.
 * @param formula - The formula typed.
 * @returns The new list, or the same list when no formula was typed.
 */
export function withTypedFormula(
  formulas: readonly FormulaColumnSpec[],
  name: string,
  formula: string
): readonly FormulaColumnSpec[] {
  if (formula.trim() === "") return formulas;
  const header = name.trim();
  const key = formulaKeyFrom(header, formulas);
  return withFormulas(formulas, [
    { key, formula, ...(header === "" ? {} : { header }) },
  ]);
}

/** The list without the formula under `key`. */
export function withoutFormula(
  formulas: readonly FormulaColumnSpec[],
  key: string
): readonly FormulaColumnSpec[] {
  return formulas.filter((spec) => spec.key !== key);
}

/** What the report says when every formula parses. */
export const FORMULAS_PARSE = "every formula parses";

/** What the list says when it holds no formulas. */
export const NO_FORMULAS = "No formulas.";

/**
 * What the report says about formulas that reference each other.
 *
 * @param cycles - The keys caught in a cycle.
 * @returns The sentence, or undefined when there is no cycle.
 */
export function cycleReport(cycles: readonly string[]): string | undefined {
  if (cycles.length === 0) return undefined;
  const keys = [...cycles].sort((a, b) => a.localeCompare(b)).join(" and ");
  return `${keys} reference each other — every cell reads #CYCLE! instead of recursing`;
}
