/* SPDX-License-Identifier: MPL-2.0 */

import type { PracticeKind, Question } from "../types";
import { isCorrect } from "./questions";

/** Session values that are persisted, independent of storage concerns. */
export type PracticeProgress = {
  order: string[];
  index: number;
  answers: Record<string, number[]>;
  revealedKeys: string[];
  autoCheck: boolean;
  shuffleOptions: boolean;
  optionSeed: number;
};

export type PracticePlan = PracticeProgress & {
  /** True when the plan continued a compatible saved session. */
  resumed: boolean;
};

/** The subset of the saved practice state the planner needs. */
export type SavedPractice = PracticeProgress & {
  kind: PracticeKind;
};

export type PracticePlanInput = {
  kind: PracticeKind;
  /** Every question key in the bank, in bank order. */
  questionKeys: string[];
  /** Wrong-book or favorite keys when the kind is one of those. */
  collectionKeys: string[];
  saved: SavedPractice | null;
  /** Injected so the planner stays deterministic in tests. */
  randomize?: (keys: string[]) => string[];
  createSeed?: () => number;
};

/**
 * Build the order and per-question state for a practice session.
 *
 * New sessions use bank or collection order; random sessions shuffle.
 * A compatible saved session is restored: sequential practice rebuilds order
 * from the bank, random practice keeps its saved order, and wrong/favorite
 * practice keeps previously seen questions first while appending new entries.
 */
export function planPracticeSession(input: PracticePlanInput): PracticePlan {
  const { kind, questionKeys, collectionKeys, saved } = input;
  const randomize = input.randomize ?? ((keys: string[]) => [...keys]);
  const createSeed = input.createSeed ?? (() => 1);
  const valid = new Set(questionKeys);
  const collectionOrder = kind === "wrong" || kind === "favorite";

  let order = (collectionOrder ? collectionKeys : questionKeys).filter((key) => valid.has(key));
  if (kind === "random") order = randomize(order);

  const canResume = Boolean(
    saved &&
      saved.kind === kind &&
      (kind === "sequential" ||
        kind === "random" ||
        saved.revealedKeys.length < saved.order.length),
  );

  if (!canResume || !saved) {
    return {
      order,
      index: 0,
      answers: {},
      revealedKeys: [],
      autoCheck: false,
      shuffleOptions: true,
      optionSeed: createSeed(),
      resumed: false,
    };
  }

  const savedOrder = saved.order.filter((key) => valid.has(key));
  if (kind === "sequential") {
    order = [...questionKeys];
  } else if (kind === "random") {
    if (savedOrder.length > 0) order = savedOrder;
  } else {
    const current = new Set(order);
    const shared = savedOrder.filter((key) => current.has(key));
    const sharedSet = new Set(shared);
    const extras = order.filter((key) => !sharedSet.has(key));
    order = [...shared, ...extras];
  }

  return {
    order,
    index: Math.min(saved.index, Math.max(0, order.length - 1)),
    answers: Object.fromEntries(
      Object.entries(saved.answers).filter(([key]) => valid.has(key)),
    ),
    revealedKeys: saved.revealedKeys.filter((key) => valid.has(key)),
    autoCheck: saved.autoCheck,
    shuffleOptions: saved.shuffleOptions !== false,
    optionSeed: saved.optionSeed || createSeed(),
    resumed: true,
  };
}

export type RevealOutcome = { correct: boolean } | null;

export type PracticeTransition = {
  state: PracticeProgress;
  /** Set when this transition judged the answer and counters must be updated. */
  outcome: RevealOutcome;
};

/**
 * Per-question state machine, selection step:
 * unanswered -> draft selection; with 即时判题 a single-choice selection
 * goes straight to revealed, while multiple choice still waits for 查看答案.
 */
export function applyPracticeSelection(
  state: PracticeProgress,
  question: Question,
  optionKey: number,
): PracticeTransition {
  if (state.revealedKeys.includes(question.key)) {
    return { state, outcome: null };
  }

  const selected = state.answers[question.key] ?? [];
  const nextSelected =
    question.type === "single"
      ? [optionKey]
      : selected.includes(optionKey)
        ? selected.filter((key) => key !== optionKey)
        : [...selected, optionKey];

  const answered: PracticeProgress = {
    ...state,
    answers: { ...state.answers, [question.key]: nextSelected },
  };

  if (state.autoCheck && question.type === "single") {
    return reveal(answered, question, nextSelected);
  }
  return { state: answered, outcome: null };
}

/**
 * Per-question state machine, check step. Checking without a selection
 * reveals the answer but records neither a right nor a wrong attempt,
 * matching the original behavior.
 */
export function applyPracticeCheck(
  state: PracticeProgress,
  question: Question,
): PracticeTransition {
  if (state.revealedKeys.includes(question.key)) {
    return { state, outcome: null };
  }

  const selected = state.answers[question.key] ?? [];
  const revealed: PracticeProgress = {
    ...state,
    revealedKeys: [...state.revealedKeys, question.key],
  };
  if (selected.length === 0) {
    return { state: revealed, outcome: null };
  }
  return { state: revealed, outcome: { correct: isCorrect(question, selected) } };
}

function reveal(
  state: PracticeProgress,
  question: Question,
  selected: number[],
): PracticeTransition {
  return {
    state: {
      ...state,
      revealedKeys: [...state.revealedKeys, question.key],
    },
    outcome: { correct: isCorrect(question, selected) },
  };
}
