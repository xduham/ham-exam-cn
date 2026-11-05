/* SPDX-License-Identifier: MPL-2.0 */

import { questionSnippet } from "./data";
import { KEYS, readJson, writeJson } from "./storage";
import type { Bank, Question } from "./types";

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

function entryId(bank: Bank, key: string): string {
  return `${bank}:${key}`;
}

export function loadWrongBook(): WrongMap {
  return readJson<WrongMap>(KEYS.wrongBook, {});
}

export function loadFavorites(): FavoriteMap {
  return readJson<FavoriteMap>(KEYS.favorites, {});
}

export function addWrong(bank: Bank, question: Question): void {
  const map = loadWrongBook();
  const id = entryId(bank, question.key);
  const previous = map[id];
  map[id] = {
    bank,
    key: question.key,
    number: question.number,
    snippet: questionSnippet(question),
    wrongCount: (previous?.wrongCount ?? 0) + 1,
    lastWrongAt: Date.now(),
  };
  writeJson(KEYS.wrongBook, map);
}

export function removeWrong(bank: Bank, key: string): void {
  const map = loadWrongBook();
  delete map[entryId(bank, key)];
  writeJson(KEYS.wrongBook, map);
}

export function removeWrongMany(bank: Bank, keys: string[]): void {
  if (keys.length === 0) return;
  const map = loadWrongBook();
  for (const key of keys) delete map[entryId(bank, key)];
  writeJson(KEYS.wrongBook, map);
}

export function wrongEntries(bank: Bank): WrongEntry[] {
  return Object.values(loadWrongBook())
    .filter((entry) => entry.bank === bank)
    .sort((a, b) => b.lastWrongAt - a.lastWrongAt);
}

export function wrongCount(bank: Bank): number {
  return Object.values(loadWrongBook()).filter((entry) => entry.bank === bank).length;
}

export function isFavorite(bank: Bank, key: string): boolean {
  return Boolean(loadFavorites()[entryId(bank, key)]);
}

export function toggleFavorite(bank: Bank, question: Question): boolean {
  const map = loadFavorites();
  const id = entryId(bank, question.key);
  if (map[id]) {
    delete map[id];
    writeJson(KEYS.favorites, map);
    return false;
  }
  map[id] = {
    bank,
    key: question.key,
    number: question.number,
    snippet: questionSnippet(question),
    createdAt: Date.now(),
  };
  writeJson(KEYS.favorites, map);
  return true;
}

export function removeFavorite(bank: Bank, key: string): void {
  const map = loadFavorites();
  delete map[entryId(bank, key)];
  writeJson(KEYS.favorites, map);
}

export function favoriteEntries(bank: Bank): FavoriteEntry[] {
  return Object.values(loadFavorites())
    .filter((entry) => entry.bank === bank)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function favoriteCount(bank: Bank): number {
  return Object.values(loadFavorites()).filter((entry) => entry.bank === bank).length;
}
