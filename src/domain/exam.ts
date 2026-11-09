/* SPDX-License-Identifier: MPL-2.0 */

import type { ExamRule } from "../rules";
import type { Question } from "../types";
import { isCorrect } from "./questions";

export type ExamScore = {
  score: number;
  answeredCount: number;
  /** Every question not answered correctly, including unanswered ones. */
  wrongKeys: string[];
  /** Answered incorrectly; these are the ones that enter the wrong book. */
  wrongAnswered: Question[];
};

/**
 * Pick singles and multiples according to the exam rule. Each group is
 * shuffled independently; the paper always runs singles first, then
 * multiples. Banks smaller than the rule produce a shorter paper.
 */
export function buildExamPaper(
  questions: Question[],
  rule: ExamRule,
  randomize: <T>(items: T[]) => T[] = <T>(items: T[]) => [...items],
): string[] {
  const singles = randomize(questions.filter((question) => question.type === "single")).slice(
    0,
    rule.singles,
  );
  const multiples = randomize(
    questions.filter((question) => question.type === "multiple"),
  ).slice(0, rule.multiples);
  return [...singles, ...multiples].map((question) => question.key);
}

export function scoreExam(
  order: string[],
  byKey: ReadonlyMap<string, Question>,
  answers: Record<string, number[]>,
): ExamScore {
  let score = 0;
  let answeredCount = 0;
  const wrongKeys: string[] = [];
  const wrongAnswered: Question[] = [];

  for (const key of order) {
    const question = byKey.get(key);
    if (!question) continue;

    const chosen = answers[key] ?? [];
    if (chosen.length > 0) answeredCount += 1;

    if (isCorrect(question, chosen)) {
      score += 1;
    } else {
      wrongKeys.push(key);
      if (chosen.length > 0) wrongAnswered.push(question);
    }
  }

  return { score, answeredCount, wrongKeys, wrongAnswered };
}

export function wrongKeysOf(
  order: string[],
  byKey: ReadonlyMap<string, Question>,
  answers: Record<string, number[]>,
): string[] {
  const keys: string[] = [];
  for (const key of order) {
    const question = byKey.get(key);
    if (question && !isCorrect(question, answers[key] ?? [])) keys.push(key);
  }
  return keys;
}

export function answeredCountOf(
  order: string[],
  answers: Record<string, number[]>,
): number {
  return order.filter((key) => (answers[key] ?? []).length > 0).length;
}

/**
 * An exam can be resumed only while its deadline is in the future and every
 * saved question still exists in the current bank.
 */
export function canResumeExam(
  order: string[],
  endAtMs: number,
  validKeys: ReadonlySet<string> | ReadonlyMap<string, unknown>,
  now: number,
): boolean {
  return order.length > 0 && endAtMs > now && order.every((key) => validKeys.has(key));
}
