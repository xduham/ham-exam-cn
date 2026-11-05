/* SPDX-License-Identifier: MPL-2.0 */

import { KEYS, readJson, writeJson } from "./storage";
import type { Bank } from "./types";
import { percent } from "./utils";

export type BankStats = {
  practiceAnswered: number;
  practiceCorrect: number;
  examAttempts: number;
  examBest: number;
  examLast: number;
  examPassed: number;
  lastActiveAt: number;
};

export type StatsMap = Record<Bank, BankStats>;

function emptyBankStats(): BankStats {
  return {
    practiceAnswered: 0,
    practiceCorrect: 0,
    examAttempts: 0,
    examBest: 0,
    examLast: 0,
    examPassed: 0,
    lastActiveAt: 0,
  };
}

export function emptyStats(): StatsMap {
  return { A: emptyBankStats(), B: emptyBankStats(), C: emptyBankStats() };
}

export function loadStats(): StatsMap {
  const stored = readJson<Partial<StatsMap>>(KEYS.stats, {});
  const base = emptyStats();
  for (const bank of ["A", "B", "C"] as Bank[]) {
    base[bank] = { ...base[bank], ...(stored[bank] ?? {}) };
  }
  return base;
}

function saveStats(stats: StatsMap): void {
  writeJson(KEYS.stats, stats);
}

export function recordPractice(bank: Bank, correct: boolean): void {
  const stats = loadStats();
  stats[bank].practiceAnswered += 1;
  if (correct) stats[bank].practiceCorrect += 1;
  stats[bank].lastActiveAt = Date.now();
  saveStats(stats);
}

export function recordExam(bank: Bank, score: number, passed: boolean): void {
  const stats = loadStats();
  stats[bank].examAttempts += 1;
  stats[bank].examBest = Math.max(stats[bank].examBest, score);
  stats[bank].examLast = score;
  if (passed) stats[bank].examPassed += 1;
  stats[bank].lastActiveAt = Date.now();
  saveStats(stats);
}

export function resetStats(): void {
  saveStats(emptyStats());
}

export function practiceAccuracy(stats: BankStats): number {
  return percent(stats.practiceCorrect, stats.practiceAnswered);
}
