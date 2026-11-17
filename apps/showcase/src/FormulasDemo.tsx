import {
  buildFormulaColumns,
  type FormulaColumnSpec,
  useFormulaUrlState,
} from "@adapttable/react/formula";
import { Suspense, useMemo, useState } from "react";

import type { Person } from "./data";
import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Warning } from "./sectionIcons";
import {
  cycleReport,
  FORMULA_EXAMPLES,
  FORMULA_START,
  FORMULAS_PARSE,
  NO_FORMULAS,
  withFormulas,
  withoutFormula,
  withTypedFormula,
} from "./shared/formulaScenario";

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
  const change = (next: readonly FormulaColumnSpec[]) => {
    if (next !== formulas) onChange(next);
  };
  const broken = Object.entries(errors);
  const cycle = cycleReport(cycles);
  return (
    <div className="fx" data-testid="formula-bar">
      <form
        className="fx__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (formula.trim() === "") return;
          change(withTypedFormula(formulas, name, formula));
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
        {FORMULA_EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            data-testid={`formula-example-${example.specs[0]?.key ?? ""}`}
            onClick={() => change(withFormulas(formulas, example.specs))}
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
              onClick={() => change(withoutFormula(formulas, spec.key))}
            >
              ×
            </button>
          </li>
        ))}
        {formulas.length === 0 && <li className="fx__empty">{NO_FORMULAS}</li>}
      </ul>

      <div className="fx__report" data-testid="formula-report" role="status">
        {broken.length === 0 && cycle === undefined ? (
          <span className="hint">
            <Check size={12} /> {FORMULAS_PARSE}
          </span>
        ) : null}
        {broken.map(([key, message]) => (
          <span className="hint" key={key}>
            <Warning size={12} /> {key}: {message}
          </span>
        ))}
        {cycle !== undefined && (
          <span className="hint">
            <Warning size={12} /> {cycle}
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
    defaultFormulas: FORMULA_START,
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
                locale={initialDemoLocale()}
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
