/* SPDX-License-Identifier: MPL-2.0 */

import { asset } from "./branding";
import type { Bank, Question } from "./types";

const bankCache = new Map<Bank, Promise<Question[]>>();

export function loadBank(bank: Bank): Promise<Question[]> {
  const cached = bankCache.get(bank);
  if (cached) return cached;

  const request = fetch(`${import.meta.env.BASE_URL}questions/${bank}.json?v=${__DATA_VERSION__}`)
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
  return question.imageUrl
    ? `${asset(`questions/${question.imageUrl}`)}?v=${__DATA_VERSION__}`
    : null;
}
