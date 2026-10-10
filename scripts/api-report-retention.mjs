import { missingDeferredReportTargets } from "./api-report-references.mjs";

/** Keep split binding contracts complete without changing their public owners. */
export function shouldRetainEntryDeclarations({
  dir,
  includeForgottenExports,
  hasValueAliases,
}) {
  return (
    includeForgottenExports ||
    dir === "vue" ||
    dir === "angular" ||
    hasValueAliases
  );
}

function messageKey(message) {
  return JSON.stringify([
    message.messageId,
    message.text,
    message.sourceFilePath,
    message.sourceFileLine,
    message.sourceFileColumn,
  ]);
}

function reportMessage(message, onMessage) {
  // A two-pass run can replace intermediate output even when its final report
  // equals the committed bytes. The caller makes the final surface comparison.
  if (message.messageId === "console-api-report-copied") {
    message.text = message.text.replace(
      "You have changed the API signature for this project. Updating ",
      "Updated API report extraction output: "
    );
  }
  onMessage(message);
}

/**
 * Retain definitions only after source-proven copies leave incomplete targets.
 * The first extraction's source findings are never discarded. The retained pass
 * reports additional findings, and counts each repeated message only once.
 */
export function extractWithReportRetention({
  invoke,
  readReport,
  publishedBases,
  includeForgottenExports: initiallyRetained,
  onMessage,
}) {
  const firstMessages = new Set();
  let result = invoke({
    includeForgottenExports: initiallyRetained,
    messageCallback(message) {
      firstMessages.add(messageKey(message));
      reportMessage(message, onMessage);
    },
  });
  if (!result.succeeded) return { result, retainedTargets: 0 };
  let fresh = readReport();
  let missingTargets = missingDeferredReportTargets(fresh, publishedBases);
  const missingBefore = missingTargets.filter(
    ({ reason }) => reason === "missing import or declaration"
  ).length;
  if (initiallyRetained || missingBefore === 0)
    return { result, fresh, missingTargets, retainedTargets: 0 };

  result = invoke({
    includeForgottenExports: true,
    // Both the result and invoke option are part of Extractor's public API.
    compilerState: result.compilerState,
    messageCallback(message) {
      if (firstMessages.has(messageKey(message))) {
        message.handled = true;
      } else {
        reportMessage(message, onMessage);
      }
    },
  });
  if (!result.succeeded) return { result, retainedTargets: 0 };
  fresh = readReport();
  missingTargets = missingDeferredReportTargets(fresh, publishedBases);
  return {
    result,
    fresh,
    missingTargets,
    retainedTargets: missingTargets.length === 0 ? missingBefore : 0,
  };
}
