/* SPDX-License-Identifier: MPL-2.0 */

import { ruleFor } from "../rules";
import { isExamActive, loadExam, loadPractice } from "../storage";
import { loadStats, practiceAccuracy } from "../stats";
import type { Bank } from "../types";
import { useCollections } from "./useCollections";

/**
 * Read-only snapshot for the home screen. Resume visibility is a business
 * rule: a wrong/favorite session is only offered while its collection is
 * non-empty.
 */
export function useHomeSummary(bank: Bank) {
  const { wrongCount, favoriteCount } = useCollections(bank);
  const practice = loadPractice(bank);
  const exam = loadExam(bank);
  const stats = loadStats()[bank];
  const practiceVisible = Boolean(
    practice &&
      (practice.kind !== "wrong" || wrongCount > 0) &&
      (practice.kind !== "favorite" || favoriteCount > 0),
  );

  return {
    practice,
    exam,
    examActive: isExamActive(exam),
    practiceVisible,
    stats,
    accuracy: practiceAccuracy(stats),
    rule: ruleFor(bank),
    wrongCount,
    favoriteCount,
  };
}
