import { Suspense, useEffect, useRef, useState } from "react";

import { DemoScenarioProvider } from "./Demo";
import { initialDemoLocale } from "./demoPresentation";
import { ADAPTERS, DemoFallback } from "./kitDemos";
import type { FeatureBodyProps } from "./matrix/featureBodies";
import { Check, Keyboard } from "./sectionIcons";
import {
  ACCESSIBILITY_HINTS,
  readAnnouncements,
  TRANSCRIPT_LENGTH,
  TRANSCRIPT_TEXT,
} from "./shared/pageHints";

/**
 * Mirror what the table announces, as visible text.
 *
 * Screen-reader output is the one part of a table a sighted reader cannot
 * check, so this page shows it: an observer watches the live regions the table
 * already renders and repeats each message here. It reads the SAME nodes a
 * screen reader would — it does not reimplement the wording — so if the
 * transcript is empty, nothing was announced.
 */
function useAnnouncements(root: HTMLElement | null): string[] {
  const [lines, setLines] = useState<string[]>([]);
  const last = useRef("");
  useEffect(() => {
    if (!root) return undefined;
    const read = () => {
      const next = readAnnouncements(root, last.current);
      last.current = next.last;
      if (next.lines.length === 0) return;
      setLines((prev) => [...next.lines, ...prev].slice(0, TRANSCRIPT_LENGTH));
    };
    const observer = new MutationObserver(read);
    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    read();
    return () => {
      observer.disconnect();
    };
  }, [root]);
  return lines;
}

export function AccessibilityDemo({
  dark,
  adapter,
}: Readonly<FeatureBodyProps>) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const announcements = useAnnouncements(root);
  const Demo = ADAPTERS[adapter] ?? ADAPTERS.mantine;
  return (
    <div className="mx-demo">
      <div className="hint-row">
        {ACCESSIBILITY_HINTS.map((hint, index) => (
          <span className="hint" key={hint}>
            {index < 2 ? <Keyboard size={12} /> : <Check size={12} />} {hint}
          </span>
        ))}
      </div>
      <div className="mx-demo__body">
        <div key={adapter} data-adapter={adapter} ref={setRoot}>
          <Suspense fallback={<DemoFallback />}>
            <DemoScenarioProvider value="accessibility">
              <Demo
                mode="frontend"
                locale={initialDemoLocale()}
                dark={dark}
                urlKey="a11y"
                cellNavigation
                columnSelectionCheckbox
                focused
              />
            </DemoScenarioProvider>
          </Suspense>
        </div>
      </div>
      <div className="mx-demo__body" data-testid="announcements">
        <strong>{TRANSCRIPT_TEXT.title}</strong>
        {announcements.length === 0 ? (
          <p>{TRANSCRIPT_TEXT.empty}</p>
        ) : (
          <ol>
            {announcements.map((line, index) => (
              <li key={`${line}-${String(index)}`}>{line}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
