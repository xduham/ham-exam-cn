/* SPDX-License-Identifier: MPL-2.0 */

import type { Bank } from "./types";

export type ExamRule = {
  total: number;
  singles: number;
  multiples: number;
  minutes: number;
  pass: number;
};

export const RULES: Record<Bank, ExamRule> = {
  A: { total: 40, singles: 32, multiples: 8, minutes: 40, pass: 30 },
  B: { total: 60, singles: 45, multiples: 15, minutes: 60, pass: 45 },
  C: { total: 90, singles: 70, multiples: 20, minutes: 90, pass: 70 },
};

export const BANK_META: Record<Bank, { label: string; hint: string; rule: string }> = {
  A: {
    label: "A 类",
    hint: "基础操作能力",
    rule: "40 题 · 40 分钟 · 30 分合格",
  },
  B: {
    label: "B 类",
    hint: "进阶操作能力",
    rule: "60 题 · 60 分钟 · 45 分合格",
  },
  C: {
    label: "C 类",
    hint: "短波与高级操作",
    rule: "90 题 · 90 分钟 · 70 分合格",
  },
};

export function ruleFor(bank: Bank): ExamRule {
  return RULES[bank];
}
