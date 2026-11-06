/* SPDX-License-Identifier: MPL-2.0 */

import type { Bank, PracticeKind } from "./types";

const PREFIX = "ham-exam-cn:v1:";

export const KEYS = {
  practice: (bank: Bank) => `${PREFIX}practice:${bank}`,
  exam: (bank: Bank) => `${PREFIX}exam:${bank}`,
  bank: `${PREFIX}bank`,
  wrongBook: `${PREFIX}wrongBook`,
  favorites: `${PREFIX}favorites`,
  stats: `${PREFIX}stats`,
};

export function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable or full; the app keeps working in memory.
  }
}

export function removeKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function clearAppData(): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(window.localStorage).filter((key) => key.startsWith(PREFIX));
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export type PracticeState = {
  bank: Bank;
  kind: PracticeKind;
  order: string[];
  index: number;
  answers: Record<string, number[]>;
  revealedKeys: string[];
  fuzzyKeys: string[];
  autoCheck: boolean;
  shuffleOptions: boolean;
  optionSeed: number;
  updatedAt: number;
};

export type ExamState = {
  bank: Bank;
  order: string[];
  answers: Record<string, number[]>;
  flags: Record<string, boolean>;
  endAtMs: number;
  startedAt: number;
  optionSeed: number;
};

function isBank(value: unknown): value is Bank {
  return value === "A" || value === "B" || value === "C";
}

/** Saved answers changed from option letters (A-D) to numeric option ids. */
function hasNumericAnswers(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).every(
    (answer) => Array.isArray(answer) && answer.every((key) => typeof key === "number"),
  );
}

export function loadPractice(bank: Bank): PracticeState | null {
  const state = readJson<PracticeState | null>(KEYS.practice(bank), null);
  if (!state || state.bank !== bank || !Array.isArray(state.order) || state.order.length === 0) {
    return null;
  }
  if (!hasNumericAnswers(state.answers)) return null;
  return {
    ...state,
    index: Math.max(0, Math.min(state.index ?? 0, state.order.length - 1)),
    answers: state.answers ?? {},
    revealedKeys: state.revealedKeys ?? [],
    fuzzyKeys: Array.isArray(state.fuzzyKeys) ? state.fuzzyKeys : [],
    autoCheck: Boolean(state.autoCheck),
    shuffleOptions: state.shuffleOptions !== false,
    optionSeed: typeof state.optionSeed === "number" ? state.optionSeed : 0,
  };
}

export function savePractice(state: PracticeState): void {
  writeJson(KEYS.practice(state.bank), { ...state, updatedAt: Date.now() });
}

export function clearPractice(bank: Bank): void {
  removeKey(KEYS.practice(bank));
}

export function loadExam(bank: Bank): ExamState | null {
  const state = readJson<ExamState | null>(KEYS.exam(bank), null);
  if (!state || state.bank !== bank || !Array.isArray(state.order) || state.order.length === 0) {
    return null;
  }
  if (!hasNumericAnswers(state.answers)) return null;
  return {
    ...state,
    answers: state.answers ?? {},
    flags: state.flags ?? {},
    optionSeed: typeof state.optionSeed === "number" ? state.optionSeed : 0,
  };
}

export function saveExam(state: ExamState): void {
  writeJson(KEYS.exam(state.bank), state);
}

export function clearExam(bank: Bank): void {
  removeKey(KEYS.exam(bank));
}

export function isExamActive(state: ExamState | null): boolean {
  return Boolean(state && state.endAtMs > Date.now());
}

export function loadBankChoice(): Bank {
  if (typeof window === "undefined") return "A";
  const value = window.localStorage.getItem(KEYS.bank);
  return isBank(value) ? value : "A";
}

export function saveBankChoice(bank: Bank): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEYS.bank, bank);
  } catch {
    // ignore
  }
}
