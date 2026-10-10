/** A queued answer belongs to one question and one live conversation owner. */
import {
  assistantQuestion,
  type TableAssistantQuestionView,
  type TableAssistantView,
} from "@adapttable/core/binding";
import { nextTick } from "vue";

export interface QuestionOwner {
  readonly question: TableAssistantQuestionView;
  readonly answer: NonNullable<TableAssistantView["answer"]>;
  readonly generation: number;
}
export interface QuestionAdmission {
  readonly current: () => TableAssistantView;
  readonly active: () => boolean;
  readonly generation: () => number;
}
/** A new presentation wrapper does not replace a question or its answer owner. */
export function captureQuestionOwner(
  assistant: TableAssistantView,
  question: TableAssistantQuestionView | undefined,
  generation: number
): QuestionOwner | undefined {
  return question && assistant.answer
    ? { question, answer: assistant.answer, generation }
    : undefined;
}
function currentQuestionOwner(
  admission: QuestionAdmission,
  owner: QuestionOwner
): TableAssistantView | undefined {
  if (!admission.active() || admission.generation() !== owner.generation)
    return undefined;
  const current = admission.current();
  return current.answer === owner.answer &&
    assistantQuestion(current.messages) === owner.question
    ? current
    : undefined;
}
export async function admitQuestionAnswer(
  admission: QuestionAdmission,
  owner: QuestionOwner,
  answer: { optionId?: string; text?: string },
  draft?: string
): Promise<void> {
  await Promise.resolve();
  await nextTick();
  const current = currentQuestionOwner(admission, owner);
  if (!current) return;
  // Typing since the click must not be erased by an older queued answer.
  if (draft !== undefined && current.draft === draft) current.setDraft("");
  // Host callbacks can synchronously dispose or replace the owner.
  if (currentQuestionOwner(admission, owner)) owner.answer(answer);
}
