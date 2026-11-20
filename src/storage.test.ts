/* SPDX-License-Identifier: MPL-2.0 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadExam, saveExam, type ExamState } from "./storage";

const store = new Map<string, string>();

const paper: ExamState = {
  bank: "A",
  order: ["A-0001", "A-0002", "A-0003"],
  index: 2,
  answers: { "A-0001": [1] },
  flags: {},
  endAtMs: 2_000,
  startedAt: 1_000,
  optionSeed: 7,
};

beforeEach(() => {
  store.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadExam", () => {
  it("returns to the saved question", () => {
    saveExam(paper);
    expect(loadExam("A")).toEqual(paper);
  });

  it("starts legacy saves without an index at the first question", () => {
    const { index: _index, ...legacy } = paper;
    store.set("ham-exam-cn:v1:exam:A", JSON.stringify(legacy));
    expect(loadExam("A")?.index).toBe(0);
  });

  it("clamps an index that no longer fits the paper", () => {
    saveExam({ ...paper, index: 99 });
    expect(loadExam("A")?.index).toBe(2);
  });
});
