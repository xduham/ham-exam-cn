/* SPDX-License-Identifier: MPL-2.0 */

import { useMemo } from "react";
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
  // Home remounts on every route change, so one read per bank is enough and
  // keeps the snapshot stable across re-renders.
  const snapshot = useMemo(() => {
    const practice = loadPractice(bank);
    const exam = loadExam(bank);
    return {
      practice,
      exam,
      examActive: isExamActive(exam),
      stats: loadStats()[bank],
    };
  }, [bank]);
  const practiceVisible = Boolean(
    snapshot.practice &&
      (snapshot.practice.kind !== "wrong" || wrongCount > 0) &&
      (snapshot.practice.kind !== "favorite" || favoriteCount > 0),
  );

  return {
    ...snapshot,
    practiceVisible,
    accuracy: practiceAccuracy(snapshot.stats),
    rule: ruleFor(bank),
    wrongCount,
    favoriteCount,
  };
}
