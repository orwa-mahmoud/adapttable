/** Shared admission and settlement of a row/batch save; it never owns drafts or rows. */
import type { EditableColumnLike } from "./cellEditing";
import type { BatchRowEdit, RowValidator } from "./editContracts";
import { defaultSaveErrorMessage } from "./editingController";
import { isThenable } from "./storePlumbing";

/** A validation failure addressed to a row or one of its fields. @public */
export interface EditCommitValidationFailure {
  readonly rowId: string;
  readonly columnKey?: string;
  readonly message: string;
}
/** Optional row/batch settlement state; absent before and after a successful save. @public */
export interface EditCommitSnapshot {
  readonly phase: "validating" | "saving" | "invalid" | "failed";
  readonly error?: string;
  readonly validation?: readonly EditCommitValidationFailure[];
}
/** Full-row validation inputs, shared by row and batch saves. @public */
export interface EditCommitValidationOptions<TRow> {
  readonly columns: readonly EditableColumnLike<TRow>[];
  readonly validateRow?: RowValidator<TRow>;
  readonly applyEdit?: (row: TRow, columnKey: string, value: unknown) => TRow;
}
export type EditCommitValidationResult = readonly EditCommitValidationFailure[];
type ValidationAnswer =
  EditCommitValidationResult | PromiseLike<EditCommitValidationResult>;

/** Validate parsed changes in order; no promise is introduced for synchronous validators. */
export function validateEditCommit<TRow>(
  edits: readonly BatchRowEdit<TRow>[],
  options: EditCommitValidationOptions<TRow>,
  active: () => boolean
): ValidationAnswer {
  const checks: (() => ValidationAnswer)[] = [];
  for (const edit of edits) {
    for (const [key, value] of Object.entries(edit.patch)) {
      const validate = options.columns.find(
        (column) => column.key === key
      )?.validate;
      if (!validate) continue;
      checks.push(() => {
        const answer = validate(value, edit.row);
        const failure = (
          message: string | undefined
        ): EditCommitValidationResult =>
          message === undefined
            ? []
            : [{ rowId: edit.rowId, columnKey: key, message }];
        return isThenable(answer)
          ? Promise.resolve(answer).then(failure)
          : failure(answer);
      });
    }
    const validateRow = options.validateRow;
    if (validateRow)
      checks.push(() => {
        const proposed = Object.entries(edit.patch).reduce(
          (next, [key, value]) =>
            options.applyEdit
              ? options.applyEdit(next, key, value)
              : { ...next, [key]: value },
          edit.row
        );
        const answer = validateRow(proposed);
        const failure = (
          value: string | Record<string, string> | undefined
        ): EditCommitValidationResult => {
          if (value === undefined) return [];
          if (typeof value === "string")
            return [{ rowId: edit.rowId, message: value }];
          return Object.entries(value).map(([columnKey, message]) => ({
            rowId: edit.rowId,
            columnKey,
            message,
          }));
        };
        return isThenable(answer)
          ? Promise.resolve(answer).then(failure)
          : failure(answer);
      });
  }
  const run = (index: number): ValidationAnswer => {
    for (let next = index; next < checks.length; next += 1) {
      if (!active()) return [];
      const result = checks[next]!();
      if (isThenable(result))
        return Promise.resolve(result).then((failures) =>
          failures.length ? failures : run(next + 1)
        );
      if (result.length) return result;
    }
    return [];
  };
  return run(0);
}
export interface EditCommitLifecycle {
  readonly busy: () => boolean;
  readonly invalidate: () => void;
  readonly dispose: () => void;
  readonly run: (input: {
    readonly validate?: (active: () => boolean) => ValidationAnswer;
    readonly commit: () => unknown;
    /** Store-owned observer dispatch; use observeEdit to isolate host observers. */
    readonly committed: () => void;
    readonly success: () => void;
    readonly failure: (message: string) => void;
    readonly invalid: (failures: EditCommitValidationResult) => void;
    readonly formatError?: (error: unknown) => string;
  }) => void;
}
/** Invalidating a continuation does not cancel a host request already admitted. @internal */
export function createEditCommitLifecycle(
  publish: (state: EditCommitSnapshot | undefined) => void
): EditCommitLifecycle {
  let generation = 0;
  let disposed = false;
  let pending = false;
  let snapshot: EditCommitSnapshot | undefined;
  const write = (next: EditCommitSnapshot | undefined) => {
    if (snapshot === next || (snapshot === undefined && next === undefined))
      return;
    snapshot = next;
    publish(next);
  };
  const invalidate = () => {
    generation += 1;
    pending = false;
    write(undefined);
  };
  return {
    busy: () => pending,
    invalidate,
    dispose: () => {
      invalidate();
      disposed = true;
    },
    run(input) {
      if (disposed || pending) return;
      const token = ++generation;
      pending = true;
      const live = () => !disposed && generation === token;
      const format = input.formatError ?? defaultSaveErrorMessage;
      const failure = (error: unknown) => {
        if (!live()) return;
        pending = false;
        let message: string;
        try {
          message = format(error);
        } catch {
          message = defaultSaveErrorMessage(error);
        }
        write({ phase: "failed", error: message });
        if (live()) input.failure(message);
      };
      const success = () => {
        if (!live()) return;
        pending = false;
        write(undefined);
        if (live()) input.success();
      };
      const send = (rethrow: boolean) => {
        if (!live()) return;
        let result: unknown;
        try {
          result = input.commit();
        } catch (error) {
          failure(error);
          if (rethrow) throw error;
          return;
        }
        // Preserve the existing observation point: the host received the request.
        if (live()) input.committed();
        if (isThenable(result)) {
          if (live()) {
            pending = true;
            write({ phase: "saving" });
          }
          void Promise.resolve(result).then(success, failure);
        } else success();
      };
      const checked = (
        failures: EditCommitValidationResult,
        rethrow: boolean
      ) => {
        if (!live()) return;
        if (failures.length) {
          pending = false;
          write({
            phase: "invalid",
            error: failures[0]?.message,
            validation: failures,
          });
          if (live()) input.invalid(failures);
        } else send(rethrow);
      };
      if (!input.validate) {
        send(true);
        return;
      }
      let answer: ValidationAnswer;
      try {
        answer = input.validate(live);
      } catch (error) {
        failure(error);
        throw error;
      }
      if (isThenable(answer)) {
        if (live()) {
          pending = true;
          write({ phase: "validating" });
        }
        void Promise.resolve(answer).then(
          (result) => checked(result, false),
          failure
        );
      } else checked(answer, true);
    },
  };
}
