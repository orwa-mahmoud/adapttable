import {
  buildFormulaColumns,
  type FormulaColumnSpec,
  useFormulaUrlState,
} from "@adapttable/core/formula";
import { Suspense, useMemo, useState } from "react";

import type { Person } from "./data";
import { DemoScenarioProvider } from "./Demo";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Warning } from "./sectionIcons";

/**
 * Where the page starts: two columns nobody wrote code for.
 */
const START: readonly FormulaColumnSpec[] = [
  { key: "margin", header: "Margin", formula: "=ROUND(budget * 0.15, 0)" },
  { key: "tag", header: "Tag", formula: '=UPPER(team) & " · " & role' },
];

/**
 * One click each, including the two that go wrong on purpose: an error belongs
 * in the cell that caused it, and a cycle has to be reported rather than
 * recursed into.
 */
const EXAMPLES: readonly {
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
      {
        key: "root",
        header: "Root",
        formula: "=ROUND(SQRT(budget), 0)",
      },
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
function keyFrom(name: string, taken: readonly FormulaColumnSpec[]): string {
  const slug = name.replaceAll(/\W/g, "");
  if (slug !== "" && !taken.some((spec) => spec.key === slug)) return slug;
  let n = taken.length + 1;
  while (taken.some((spec) => spec.key === `fx${String(n)}`)) n++;
  return `fx${String(n)}`;
}

/**
 * The page's own formula bar — host chrome, not table chrome: the table renders
 * the columns it is given, and typing the formula is this demo's business the
 * way a real app's formula bar is that app's business.
 */
function FormulaBar({
  formulas,
  errors,
  cycles,
  onChange,
}: Readonly<{
  formulas: readonly FormulaColumnSpec[];
  errors: Readonly<Record<string, string>>;
  cycles: readonly string[];
  onChange: (next: readonly FormulaColumnSpec[]) => void;
}>) {
  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");
  const add = (specs: readonly FormulaColumnSpec[]) => {
    const fresh = specs.filter(
      (spec) => !formulas.some((existing) => existing.key === spec.key)
    );
    if (fresh.length > 0) onChange([...formulas, ...fresh]);
  };
  const broken = Object.entries(errors);
  return (
    <div className="fx" data-testid="formula-bar">
      <form
        className="fx__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (formula.trim() === "") return;
          const header = name.trim();
          const key = keyFrom(header, formulas);
          add([{ key, formula, ...(header === "" ? {} : { header }) }]);
          setName("");
          setFormula("");
        }}
      >
        <label className="fx__field">
          <span>Column</span>
          <input
            data-testid="formula-name"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Per month"
          />
        </label>
        <label className="fx__field fx__field--wide">
          <span>Formula</span>
          <input
            data-testid="formula-text"
            value={formula}
            onChange={(event) => setFormula(event.currentTarget.value)}
            placeholder="=ROUND(budget / 12, 0)"
            spellCheck={false}
          />
        </label>
        <button type="submit" data-testid="formula-add">
          Add column
        </button>
      </form>

      <div className="fx__examples">
        {EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            data-testid={`formula-example-${example.specs[0]?.key ?? ""}`}
            onClick={() => add(example.specs)}
          >
            {example.label}
          </button>
        ))}
      </div>

      <ul className="fx__chips" data-testid="formula-columns">
        {formulas.map((spec) => (
          <li key={spec.key}>
            <code>
              {spec.header ?? spec.key}
              {": "}
              {spec.formula}
            </code>
            <button
              type="button"
              aria-label={`Remove ${spec.header ?? spec.key}`}
              data-testid={`formula-remove-${spec.key}`}
              onClick={() =>
                onChange(formulas.filter((other) => other.key !== spec.key))
              }
            >
              ×
            </button>
          </li>
        ))}
        {formulas.length === 0 && <li className="fx__empty">No formulas.</li>}
      </ul>

      <div className="fx__report" data-testid="formula-report" role="status">
        {broken.length === 0 && cycles.length === 0 ? (
          <span className="hint">
            <Check size={12} /> every formula parses
          </span>
        ) : null}
        {broken.map(([key, message]) => (
          <span className="hint" key={key}>
            <Warning size={12} /> {key}: {message}
          </span>
        ))}
        {cycles.length > 0 && (
          <span className="hint">
            <Warning size={12} />{" "}
            {[...cycles].sort((a, b) => a.localeCompare(b)).join(" and ")}{" "}
            reference each other — every cell reads #CYCLE! instead of recursing
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The /formulas/ page: one dataset, a formula bar, and the table the formulas
 * become — in whichever kit the reader picks. Only the live demo writes the
 * address bar.
 */
export function FormulasDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  const { formulas, onFormulasChange } = useFormulaUrlState({
    urlSync: false,
    defaultFormulas: START,
  });
  // Rebuilt only when the list changes: the build carries the per-row cache the
  // cells, the comparator and the export all read through.
  const { columns, errors, cycles } = useMemo(
    () => buildFormulaColumns<Person>(formulas),
    [formulas]
  );

  return (
    <div className="mx-demo">
      <FormulaBar
        formulas={formulas}
        errors={errors}
        cycles={cycles}
        onChange={onFormulasChange}
      />
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="formulas">
              <Demo
                mode="frontend"
                locale="en"
                dark={dark}
                urlKey="fx"
                formulaColumns={columns}
                derivedFields
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
