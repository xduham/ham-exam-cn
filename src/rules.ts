/* SPDX-License-Identifier: MPL-2.0 */

import type { Bank } from "./types";

export type ExamRule = {
  singles: number;
  multiples: number;
  /** Derived from singles + multiples so the blueprint cannot drift. */
  total: number;
  minutes: number;
  pass: number;
};

/**
 * Fixed exam blueprint: A 32+8, B 45+15, C 70+20.
 * Keep the question counts here; paper selection only consumes them.
 */
function examRule(
  singles: number,
  multiples: number,
  minutes: number,
  pass: number,
): ExamRule {
  return { singles, multiples, total: singles + multiples, minutes, pass };
}

export const RULES: Record<Bank, ExamRule> = {
  A: examRule(32, 8, 40, 30),
  B: examRule(45, 15, 60, 45),
  C: examRule(70, 20, 90, 70),
};

export type ExamComposition = {
  /** Minimum number of image questions in one paper. */
  minImages: number;
  /** Minimum total questions from every chapter. */
  minPerChapter: number;
  /** Minimum multiple-choice questions from every chapter that has any. */
  minMultiplesPerChapter: number;
  /** Minimum questions first introduced at the level being examined. */
  minNewLevel: number;
  /** Maximum multiple-choice questions whose answer is all four options. */
  maxFourAnswerMultiples: number;
};

/**
 * Sampling floors applied after the fixed paper counts. `minNewLevel` keeps
 * the target level's own questions from being diluted by inherited ones:
 * B and C banks are cumulative, so proportional sampling would otherwise
 * fill only about 26 and 14 slots with their new material.
 */
export const COMPOSITION: Record<Bank, ExamComposition> = {
  A: {
    minImages: 1,
    minPerChapter: 2,
    minMultiplesPerChapter: 1,
    minNewLevel: 0,
    maxFourAnswerMultiples: 3,
  },
  B: {
    minImages: 2,
    minPerChapter: 2,
    minMultiplesPerChapter: 1,
    minNewLevel: 30,
    maxFourAnswerMultiples: 5,
  },
  C: {
    minImages: 4,
    minPerChapter: 2,
    minMultiplesPerChapter: 1,
    minNewLevel: 27,
    maxFourAnswerMultiples: 8,
  },
};

export function compositionFor(bank: Bank): ExamComposition {
  return COMPOSITION[bank];
}

export const BANK_META: Record<Bank, { label: string; hint: string }> = {
  A: {
    label: "A 类",
    hint: "基础操作能力",
  },
  B: {
    label: "B 类",
    hint: "进阶操作能力",
  },
  C: {
    label: "C 类",
    hint: "短波与高级操作",
  },
};

export function ruleFor(bank: Bank): ExamRule {
  return RULES[bank];
}

export function ruleSummary(rule: ExamRule): string {
  return `${rule.total} 题 · ${rule.minutes} 分钟 · ${rule.pass} 分合格`;
}
