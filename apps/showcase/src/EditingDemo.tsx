import { Suspense, useMemo, useState } from "react";

import { EDITING_DEFAULT_LAYOUT } from "./data";
import { DemoEditPolicyProvider, DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Bolt, Check } from "./sectionIcons";

export function EditingDemo({ dark, adapter }: Readonly<FeatureBodyProps>) {
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  const [allowEditing, setAllowEditing] = useState(true);
  const [rejectNext, setRejectNext] = useState(false);
  const editPolicy = useMemo(
    () => ({ rejectNext, onRejected: () => setRejectNext(false) }),
    [rejectNext]
  );
  return (
    <div className="mx-demo">
      <div className="hint-row">
        <button
          type="button"
          className={`seg__btn${allowEditing ? " is-on" : ""}`}
          aria-pressed={allowEditing}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setAllowEditing((current) => !current)}
        >
          Allow editing
        </button>
        <button
          type="button"
          className={`seg__btn${rejectNext ? " is-on" : ""}`}
          aria-pressed={rejectNext}
          onClick={() => setRejectNext((current) => !current)}
        >
          Reject next save
        </button>
        <span className="hint">
          <Bolt size={12} /> double-click any cell to edit it
        </span>
        <span className="hint">
          <Check size={12} /> Enter commits · Escape cancels · Tab advances
        </span>
        <span className="hint">
          <Check size={12} /> text, number and select editors
        </span>
        <span className="hint">
          <Bolt size={12} /> select cells, then drag the corner or paste with
          Ctrl/Cmd+V
        </span>
        <span className="hint">
          <Check size={12} /> Ctrl/Cmd+Z undoes · Ctrl/Cmd+F finds in place
        </span>
        <span className="hint">
          <Bolt size={12} /> Simulate incoming update is off until a cell is
          open, then asks Keep mine / Take theirs with a real incoming value
        </span>
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="editing">
              <DemoEditPolicyProvider value={editPolicy}>
                <Demo
                  mode="frontend"
                  locale={initialDemoLocale()}
                  dark={dark}
                  urlKey="edit"
                  defaultColumnLayout={EDITING_DEFAULT_LAYOUT}
                  editing={allowEditing}
                  cellNavigation
                  columnSelectionCheckbox
                  focused
                />
              </DemoEditPolicyProvider>
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
