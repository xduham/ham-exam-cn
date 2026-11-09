/* SPDX-License-Identifier: MPL-2.0 */

import { describe, expect, it } from "vitest";
import type { Question } from "../types";
import {
  applyPracticeCheck,
  applyPracticeSelection,
  planPracticeSession,
  toggleKey,
  type PracticeProgress,
  type SavedPractice,
} from "./practice";

function question(
  key: string,
  answerKeys: number[] = [1],
  type: "single" | "multiple" = "single",
): Question {
  return {
    key,
    number: key,
    code: null,
    question: `题目 ${key}`,
    options: [
      { key: 1, text: "甲" },
      { key: 2, text: "乙" },
      { key: 3, text: "丙" },
      { key: 4, text: "丁" },
    ],
    answer_keys: answerKeys,
    type,
    imageUrl: null,
  };
}

function progress(overrides: Partial<PracticeProgress> = {}): PracticeProgress {
  return {
    order: ["A", "B"],
    index: 0,
    answers: {},
    revealedKeys: [],
    fuzzyKeys: [],
    autoCheck: false,
    shuffleOptions: true,
    optionSeed: 7,
    ...overrides,
  };
}

function saved(overrides: Partial<SavedPractice> = {}): SavedPractice {
  return {
    ...progress(),
    kind: "sequential",
    ...overrides,
  };
}

const keys = ["A", "B", "C", "D"];

describe("planPracticeSession", () => {
  it("builds a fresh sequential plan in bank order", () => {
    const plan = planPracticeSession({
      kind: "sequential",
      questionKeys: keys,
      collectionKeys: [],
      saved: null,
      createSeed: () => 11,
    });

    expect(plan.order).toEqual(keys);
    expect(plan.index).toBe(0);
    expect(plan.answers).toEqual({});
    expect(plan.autoCheck).toBe(false);
    expect(plan.shuffleOptions).toBe(true);
    expect(plan.optionSeed).toBe(11);
    expect(plan.resumed).toBe(false);
  });

  it("restores a compatible sequential session and drops vanished questions", () => {
    const plan = planPracticeSession({
      kind: "sequential",
      questionKeys: keys,
      collectionKeys: [],
      saved: saved({
        order: ["A", "B", "X"],
        index: 2,
        answers: { A: [2], X: [1] },
        revealedKeys: ["A", "X"],
        fuzzyKeys: ["B", "X"],
        autoCheck: true,
        shuffleOptions: false,
        optionSeed: 42,
      }),
      createSeed: () => 99,
    });

    expect(plan.resumed).toBe(true);
    expect(plan.order).toEqual(keys);
    expect(plan.index).toBe(2);
    expect(plan.answers).toEqual({ A: [2] });
    expect(plan.revealedKeys).toEqual(["A"]);
    expect(plan.fuzzyKeys).toEqual(["B"]);
    expect(plan.autoCheck).toBe(true);
    expect(plan.shuffleOptions).toBe(false);
    expect(plan.optionSeed).toBe(42);
  });

  it("keeps the saved random order", () => {
    const plan = planPracticeSession({
      kind: "random",
      questionKeys: keys,
      collectionKeys: [],
      saved: saved({ kind: "random", order: ["C", "A", "D", "B"] }),
      randomize: (items) => [...items].reverse(),
      createSeed: () => 5,
    });

    expect(plan.resumed).toBe(true);
    expect(plan.order).toEqual(["C", "A", "D", "B"]);
  });

  it("randomizes a fresh random session", () => {
    const plan = planPracticeSession({
      kind: "random",
      questionKeys: keys,
      collectionKeys: [],
      saved: null,
      randomize: (items) => [...items].reverse(),
      createSeed: () => 5,
    });

    expect(plan.order).toEqual(["D", "C", "B", "A"]);
    expect(plan.resumed).toBe(false);
  });

  it("merges a saved wrong-book session with newly added entries", () => {
    const plan = planPracticeSession({
      kind: "wrong",
      questionKeys: keys,
      collectionKeys: ["B", "A", "C"],
      saved: saved({
        kind: "wrong",
        order: ["A", "B"],
        index: 1,
        revealedKeys: ["A"],
      }),
      createSeed: () => 3,
    });

    expect(plan.resumed).toBe(true);
    expect(plan.order).toEqual(["A", "B", "C"]);
    expect(plan.index).toBe(1);
  });

  it("starts a fresh wrong session when the saved one was fully revealed", () => {
    const plan = planPracticeSession({
      kind: "wrong",
      questionKeys: keys,
      collectionKeys: ["B", "C"],
      saved: saved({
        kind: "wrong",
        order: ["A", "B"],
        revealedKeys: ["A", "B"],
      }),
      createSeed: () => 3,
    });

    expect(plan.resumed).toBe(false);
    expect(plan.order).toEqual(["B", "C"]);
    expect(plan.revealedKeys).toEqual([]);
  });

  it("does not resume a session of another kind", () => {
    const plan = planPracticeSession({
      kind: "favorite",
      questionKeys: keys,
      collectionKeys: ["D"],
      saved: saved({ kind: "sequential", revealedKeys: [] }),
      createSeed: () => 3,
    });

    expect(plan.resumed).toBe(false);
    expect(plan.order).toEqual(["D"]);
  });

  it("replaces a missing option seed", () => {
    const plan = planPracticeSession({
      kind: "sequential",
      questionKeys: keys,
      collectionKeys: [],
      saved: saved({ optionSeed: 0 }),
      createSeed: () => 77,
    });

    expect(plan.optionSeed).toBe(77);
  });
});

describe("applyPracticeSelection", () => {
  it("replaces the choice for a single-choice question", () => {
    const state = progress({ answers: { A: [1] } });
    const next = applyPracticeSelection(state, question("A"), 3);

    expect(next.state.answers.A).toEqual([3]);
    expect(next.state.revealedKeys).toEqual([]);
    expect(next.outcome).toBeNull();
  });

  it("toggles choices for a multiple-choice question", () => {
    const state = progress({ answers: { A: [1, 2] } });
    const added = applyPracticeSelection(state, question("A", [1, 2], "multiple"), 3);
    const removed = applyPracticeSelection(added.state, question("A", [1, 2], "multiple"), 1);

    expect(added.state.answers.A).toEqual([1, 2, 3]);
    expect(removed.state.answers.A).toEqual([2, 3]);
  });

  it("reveals immediately with auto-check on a single-choice question", () => {
    const state = progress({ autoCheck: true });
    const next = applyPracticeSelection(state, question("A", [2]), 2);

    expect(next.state.revealedKeys).toEqual(["A"]);
    expect(next.outcome).toEqual({ correct: true });
  });

  it("waits for the check button with auto-check on a multiple-choice question", () => {
    const state = progress({ autoCheck: true });
    const next = applyPracticeSelection(state, question("A", [1, 2], "multiple"), 1);

    expect(next.state.revealedKeys).toEqual([]);
    expect(next.outcome).toBeNull();
  });

  it("ignores input after the question is revealed", () => {
    const state = progress({ revealedKeys: ["A"] });
    const next = applyPracticeSelection(state, question("A"), 2);

    expect(next.state).toBe(state);
    expect(next.outcome).toBeNull();
  });
});

describe("applyPracticeCheck", () => {
  it("reveals an answered question and reports the outcome", () => {
    const state = progress({ answers: { A: [3] } });
    const next = applyPracticeCheck(state, question("A", [1]));

    expect(next.state.revealedKeys).toEqual(["A"]);
    expect(next.outcome).toEqual({ correct: false });
  });

  it("reveals an unanswered question without recording an attempt", () => {
    const next = applyPracticeCheck(progress(), question("A"));

    expect(next.state.revealedKeys).toEqual(["A"]);
    expect(next.outcome).toBeNull();
  });

  it("does nothing when already revealed", () => {
    const state = progress({ revealedKeys: ["A"] });
    const next = applyPracticeCheck(state, question("A"));

    expect(next.state).toBe(state);
    expect(next.outcome).toBeNull();
  });

  it("treats answer order as irrelevant", () => {
    const state = progress({ answers: { A: [3, 1] } });
    const next = applyPracticeCheck(state, question("A", [1, 3], "multiple"));

    expect(next.outcome).toEqual({ correct: true });
  });
});

describe("toggleKey", () => {
  it("adds and removes a key", () => {
    expect(toggleKey([], "A")).toEqual(["A"]);
    expect(toggleKey(["A", "B"], "A")).toEqual(["B"]);
  });
});
