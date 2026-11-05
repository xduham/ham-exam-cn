/* SPDX-License-Identifier: MPL-2.0 */

import { asset } from "./branding";
import type { Bank, Question } from "./types";

const bankCache = new Map<Bank, Promise<Question[]>>();

export function loadBank(bank: Bank): Promise<Question[]> {
  const cached = bankCache.get(bank);
  if (cached) return cached;

  const request = fetch(`${import.meta.env.BASE_URL}questions/${bank}.json`)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`题库 ${bank} 加载失败（${response.status}）`);
      }
      const data = (await response.json()) as Question[];
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error(`题库 ${bank} 为空`);
      }
      return data;
    })
    .catch((error: unknown) => {
      bankCache.delete(bank);
      throw error;
    });

  bankCache.set(bank, request);
  return request;
}

export function imageUrl(question: Question): string | null {
  return question.imageUrl ? asset(`questions/${question.imageUrl}`) : null;
}

export function sortedKeys(keys: string[]): string[] {
  return [...keys].sort();
}

export function isCorrect(question: Question, selected: string[]): boolean {
  return sortedKeys(selected).join(",") === sortedKeys(question.answer_keys).join(",");
}

export function questionLabel(question: Question): string {
  return question.number ?? question.key;
}

export function questionSnippet(question: Question, length = 90): string {
  const text = question.question.replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
