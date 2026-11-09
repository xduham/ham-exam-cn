/* SPDX-License-Identifier: MPL-2.0 */

import { useEffect, useRef, useState } from "react";
import {
  applyPracticeCheck,
  applyPracticeSelection,
  planPracticeSession,
  toggleKey,
  type PracticePlan,
} from "../domain/practice";
import { clearPractice, loadPractice, savePractice } from "../storage";
import { recordPractice } from "../stats";
import type { Bank, PracticeKind, Question } from "../types";
import { moveIndex, randomSeed, shuffle } from "../utils";
import { useBank } from "./useBank";
import { useCollections } from "./useCollections";

type Session = PracticePlan & {
  bank: Bank;
  kind: PracticeKind;
};

export type PracticeSessionStatus = "loading" | "error" | "ready";

export type PracticeCurrent = {
  question: Question;
  selected: number[];
  revealed: boolean;
  fuzzy: boolean;
  favorite: boolean;
};

export type PracticeSession = {
  status: PracticeSessionStatus;
  error: string | null;
  questions: Question[];
  current: PracticeCurrent | null;
  index: number;
  total: number;
  answeredCount: number;
  optionSeed: number;
  settings: { autoCheck: boolean; shuffleOptions: boolean };
  actions: {
    select: (optionKey: number) => void;
    check: () => void;
    toggleFavorite: () => void;
    toggleFuzzy: () => void;
    prev: () => void;
    next: () => void;
    jumpTo: (key: string) => void;
    jumpToIndex: (index: number) => void;
    setAutoCheck: (value: boolean) => void;
    setShuffleOptions: (value: boolean) => void;
    finish: () => void;
  };
};

/**
 * Practice session state machine. Planning happens once per bank+kind; later
 * wrong-book changes must not rebuild the current order.
 */
export function usePracticeSession(bank: Bank, kind: PracticeKind): PracticeSession {
  const bankResource = useBank(bank);
  const collections = useCollections(bank);
  const collectionsRef = useRef(collections);
  collectionsRef.current = collections;

  const [session, setSession] = useState<Session | null>(null);
  const sessionRef = useRef<Session | null>(null);

  function commit(next: Session): void {
    sessionRef.current = next;
    setSession(next);
  }

  function activeSession(): Session | null {
    const current = sessionRef.current;
    return current && current.bank === bank && current.kind === kind ? current : null;
  }

  useEffect(() => {
    if (bankResource.status !== "ready") {
      sessionRef.current = null;
      setSession(null);
      return;
    }

    const snapshot = collectionsRef.current;
    const plan = planPracticeSession({
      kind,
      questionKeys: bankResource.questions.map((question) => question.key),
      collectionKeys:
        kind === "wrong"
          ? snapshot.wrongEntries.map((entry) => entry.key)
          : kind === "favorite"
            ? snapshot.favoriteEntries.map((entry) => entry.key)
            : [],
      saved: loadPractice(bank),
      randomize: shuffle,
      createSeed: randomSeed,
    });

    const next: Session = { ...plan, bank, kind };
    sessionRef.current = next;
    setSession(next);
  }, [bank, kind, bankResource.status, bankResource.questions]);

  const active =
    session && session.bank === bank && session.kind === kind ? session : null;

  useEffect(() => {
    if (!active || active.order.length === 0) return;
    savePractice({
      bank,
      kind,
      order: active.order,
      index: active.index,
      answers: active.answers,
      revealedKeys: active.revealedKeys,
      fuzzyKeys: active.fuzzyKeys,
      autoCheck: active.autoCheck,
      shuffleOptions: active.shuffleOptions,
      optionSeed: active.optionSeed,
      updatedAt: Date.now(),
    });
  }, [bank, kind, active]);

  const currentKey = active ? (active.order[active.index] ?? null) : null;
  const currentQuestion = currentKey ? bankResource.byKey.get(currentKey) : undefined;

  const current: PracticeCurrent | null =
    active && currentQuestion
      ? {
          question: currentQuestion,
          selected: active.answers[currentQuestion.key] ?? [],
          revealed: active.revealedKeys.includes(currentQuestion.key),
          fuzzy: active.fuzzyKeys.includes(currentQuestion.key),
          favorite: collections.isFavorite(currentQuestion.key),
        }
      : null;

  const answeredCount = active
    ? active.order.filter((key) => (active.answers[key] ?? []).length > 0).length
    : 0;

  const status: PracticeSessionStatus =
    bankResource.status === "error"
      ? "error"
      : bankResource.status === "ready" && active
        ? "ready"
        : "loading";

  function currentState(): { state: Session; question: Question } | null {
    const state = activeSession();
    if (!state) return null;
    const question = bankResource.byKey.get(state.order[state.index] ?? "");
    return question ? { state, question } : null;
  }

  function afterReveal(question: Question, correct: boolean): void {
    recordPractice(bank, correct);
    if (correct) {
      if (kind === "wrong") collections.removeWrong(question.key);
    } else {
      collections.recordWrong(question);
    }
  }

  function select(optionKey: number): void {
    const currentStateValue = currentState();
    if (!currentStateValue) return;
    const { state, question } = currentStateValue;
    const transition = applyPracticeSelection(state, question, optionKey);
    if (transition.state === state) return;
    commit({ ...state, ...transition.state, bank, kind });
    if (transition.outcome) afterReveal(question, transition.outcome.correct);
  }

  function check(): void {
    const currentStateValue = currentState();
    if (!currentStateValue) return;
    const { state, question } = currentStateValue;
    const transition = applyPracticeCheck(state, question);
    if (transition.state === state) return;
    commit({ ...state, ...transition.state, bank, kind });
    if (transition.outcome) afterReveal(question, transition.outcome.correct);
  }

  function toggleFavorite(): void {
    const currentStateValue = currentState();
    if (currentStateValue) collections.toggleFavorite(currentStateValue.question);
  }

  function toggleFuzzy(): void {
    const state = activeSession();
    if (!state) return;
    const key = state.order[state.index];
    if (!key) return;
    commit({ ...state, fuzzyKeys: toggleKey(state.fuzzyKeys, key) });
  }

  function move(delta: number): void {
    const state = activeSession();
    if (!state) return;
    commit({ ...state, index: moveIndex(state.index, delta, state.order.length) });
  }

  function jumpTo(key: string): void {
    const state = activeSession();
    if (!state) return;
    const index = state.order.indexOf(key);
    if (index >= 0) commit({ ...state, index });
  }

  function jumpToIndex(index: number): void {
    const state = activeSession();
    if (!state || state.order.length === 0) return;
    const nextIndex = Math.max(0, Math.min(state.order.length - 1, index));
    commit({ ...state, index: nextIndex });
  }

  function setAutoCheck(value: boolean): void {
    const state = activeSession();
    if (state) commit({ ...state, autoCheck: value });
  }

  function setShuffleOptions(value: boolean): void {
    const state = activeSession();
    if (state) commit({ ...state, shuffleOptions: value });
  }

  function finish(): void {
    clearPractice(bank);
    sessionRef.current = null;
    setSession(null);
  }

  return {
    status,
    error: bankResource.error,
    questions: bankResource.questions,
    current,
    index: active?.index ?? 0,
    total: active?.order.length ?? 0,
    answeredCount,
    optionSeed: active?.optionSeed ?? 0,
    settings: {
      autoCheck: active?.autoCheck ?? false,
      shuffleOptions: active?.shuffleOptions ?? true,
    },
    actions: {
      select,
      check,
      toggleFavorite,
      toggleFuzzy,
      prev: () => move(-1),
      next: () => move(1),
      jumpTo,
      jumpToIndex,
      setAutoCheck,
      setShuffleOptions,
      finish,
    },
  };
}
