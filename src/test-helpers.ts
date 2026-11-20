/* SPDX-License-Identifier: MPL-2.0 */

import type { Question } from "./types";

/** Question fixture shared by the domain tests. */
export function makeQuestion(overrides: Partial<Question> & { key: string }): Question {
  return {
    number: overrides.key,
    code: null,
    section: null,
    question: `题目 ${overrides.key}`,
    options: [
      { key: 1, text: "甲" },
      { key: 2, text: "乙" },
      { key: 3, text: "丙" },
      { key: 4, text: "丁" },
    ],
    answer_keys: [1],
    type: "single",
    imageUrl: null,
    ...overrides,
  };
}

/** Deterministic stand-in for shuffle(). */
export const identity = <T,>(items: T[]): T[] => [...items];
