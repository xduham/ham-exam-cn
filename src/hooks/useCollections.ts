/* SPDX-License-Identifier: MPL-2.0 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { loadFavorites, loadWrongBook, saveFavorites, saveWrongBook } from "../collections";
import {
  favoriteEntriesFor,
  toggleFavoriteEntry,
  withWrong,
  withoutFavorite,
  withoutWrong,
  wrongEntriesFor,
  type FavoriteMap,
  type WrongMap,
} from "../domain/collections";
import type { Bank, Question } from "../types";

type CollectionsState = {
  wrong: WrongMap;
  favorites: FavoriteMap;
};

type Action =
  | { type: "recordWrong"; bank: Bank; question: Question; now: number }
  | { type: "removeWrong"; bank: Bank; keys: string[] }
  | { type: "toggleFavorite"; bank: Bank; question: Question; now: number }
  | { type: "removeFavorite"; bank: Bank; keys: string[] };

function init(): CollectionsState {
  return { wrong: loadWrongBook(), favorites: loadFavorites() };
}

function reducer(state: CollectionsState, action: Action): CollectionsState {
  switch (action.type) {
    case "recordWrong":
      return {
        ...state,
        wrong: withWrong(state.wrong, action.bank, action.question, action.now),
      };
    case "removeWrong":
      return {
        ...state,
        wrong: withoutWrong(state.wrong, action.bank, action.keys),
      };
    case "toggleFavorite":
      return {
        ...state,
        favorites: toggleFavoriteEntry(
          state.favorites,
          action.bank,
          action.question,
          action.now,
        ).map,
      };
    case "removeFavorite":
      return {
        ...state,
        favorites: withoutFavorite(state.favorites, action.bank, action.keys),
      };
  }
}

/**
 * Wrong-book and favorites state machine. The reducer stays pure; persistence
 * runs after commit, so StrictMode's double-invoked updaters cannot double
 * count a wrong answer.
 */
export function useCollections(bank: Bank) {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const persistedRef = useRef(state);

  useEffect(() => {
    let next = persistedRef.current;
    if (next.wrong !== state.wrong) {
      saveWrongBook(state.wrong);
      next = { ...next, wrong: state.wrong };
    }
    if (next.favorites !== state.favorites) {
      saveFavorites(state.favorites);
      next = { ...next, favorites: state.favorites };
    }
    persistedRef.current = next;
  }, [state]);

  const wrongEntries = useMemo(
    () => wrongEntriesFor(state.wrong, bank),
    [state.wrong, bank],
  );

  const favoriteEntries = useMemo(
    () => favoriteEntriesFor(state.favorites, bank),
    [state.favorites, bank],
  );

  const favoriteKeys = useMemo(
    () => new Set(favoriteEntries.map((entry) => entry.key)),
    [favoriteEntries],
  );

  const recordWrong = useCallback(
    (question: Question) => {
      dispatch({ type: "recordWrong", bank, question, now: Date.now() });
    },
    [bank],
  );

  const removeWrong = useCallback(
    (key: string) => {
      dispatch({ type: "removeWrong", bank, keys: [key] });
    },
    [bank],
  );

  const toggleFavorite = useCallback(
    (question: Question) => {
      dispatch({ type: "toggleFavorite", bank, question, now: Date.now() });
    },
    [bank],
  );

  const removeFavorite = useCallback(
    (key: string) => {
      dispatch({ type: "removeFavorite", bank, keys: [key] });
    },
    [bank],
  );

  const isFavorite = useCallback(
    (key: string) => favoriteKeys.has(key),
    [favoriteKeys],
  );

  return {
    wrongEntries,
    favoriteEntries,
    wrongCount: wrongEntries.length,
    favoriteCount: favoriteEntries.length,
    isFavorite,
    recordWrong,
    removeWrong,
    toggleFavorite,
    removeFavorite,
  };
}
