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
