/* SPDX-License-Identifier: MPL-2.0 */

import type { FavoriteMap, WrongMap } from "./domain/collections";
import { KEYS, readJson, writeJson } from "./storage";

export type { FavoriteEntry, FavoriteMap, WrongEntry, WrongMap } from "./domain/collections";

/** Persistence adapter for the wrong book and favorites collections. */
export function loadWrongBook(): WrongMap {
  return readJson<WrongMap>(KEYS.wrongBook, {});
}

export function saveWrongBook(map: WrongMap): void {
  writeJson(KEYS.wrongBook, map);
}

export function loadFavorites(): FavoriteMap {
  return readJson<FavoriteMap>(KEYS.favorites, {});
}

export function saveFavorites(map: FavoriteMap): void {
  writeJson(KEYS.favorites, map);
}
