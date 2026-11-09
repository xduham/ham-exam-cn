/* SPDX-License-Identifier: MPL-2.0 */

import type { Bank, Question } from "../types";
import { questionSnippet } from "./questions";

export type WrongEntry = {
  bank: Bank;
  key: string;
  number: string | null;
  snippet: string;
  wrongCount: number;
  lastWrongAt: number;
};

export type FavoriteEntry = {
  bank: Bank;
  key: string;
  number: string | null;
  snippet: string;
  createdAt: number;
};

export type WrongMap = Record<string, WrongEntry>;
export type FavoriteMap = Record<string, FavoriteEntry>;

export function entryId(bank: Bank, key: string): string {
  return `${bank}:${key}`;
}

/** Wrong-book entry lifecycle: absent -> present, and repeated errors increment. */
export function withWrong(
  map: WrongMap,
  bank: Bank,
  question: Question,
  now: number,
): WrongMap {
  const id = entryId(bank, question.key);
  const previous = map[id];
  return {
    ...map,
    [id]: {
      bank,
      key: question.key,
      number: question.number,
      snippet: questionSnippet(question),
      wrongCount: (previous?.wrongCount ?? 0) + 1,
      lastWrongAt: now,
    },
  };
}

export function withoutWrong(map: WrongMap, bank: Bank, keys: string[]): WrongMap {
  if (keys.length === 0) return map;
  const next = { ...map };
  for (const key of keys) delete next[entryId(bank, key)];
  return next;
}

export function wrongEntriesFor(map: WrongMap, bank: Bank): WrongEntry[] {
  return Object.values(map)
    .filter((entry) => entry.bank === bank)
    .sort((left, right) => right.lastWrongAt - left.lastWrongAt);
}

export function toggleFavoriteEntry(
  map: FavoriteMap,
  bank: Bank,
  question: Question,
  now: number,
): { map: FavoriteMap; favorited: boolean } {
  const id = entryId(bank, question.key);
  if (map[id]) {
    const next = { ...map };
    delete next[id];
    return { map: next, favorited: false };
  }
  return {
    map: {
      ...map,
      [id]: {
        bank,
        key: question.key,
        number: question.number,
        snippet: questionSnippet(question),
        createdAt: now,
      },
    },
    favorited: true,
  };
}

export function withoutFavorite(map: FavoriteMap, bank: Bank, keys: string[]): FavoriteMap {
  if (keys.length === 0) return map;
  const next = { ...map };
  for (const key of keys) delete next[entryId(bank, key)];
  return next;
}

export function favoriteEntriesFor(map: FavoriteMap, bank: Bank): FavoriteEntry[] {
  return Object.values(map)
    .filter((entry) => entry.bank === bank)
    .sort((left, right) => right.createdAt - left.createdAt);
}
