/* SPDX-License-Identifier: MPL-2.0 */

import { describe, expect, it } from "vitest";
import type { Question } from "../types";
import {
  answeredCountOf,
  buildExamPaper,
  canResumeExam,
  scoreExam,
  wrongKeysOf,
} from "./exam";

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

function mapOf(items: Question[]): Map<string, Question> {
  return new Map(items.map((item) => [item.key, item]));
}

const identity = <T,>(items: T[]): T[] => [...items];

describe("buildExamPaper", () => {
  it("takes the configured number of singles and multiples", () => {
    const singles = ["s1", "s2", "s3"].map((key) => question(key));
    const multiples = ["m1", "m2"].map((key) => question(key, [1, 2], "multiple"));

    const order = buildExamPaper([...singles, ...multiples], {
      total: 4,
      singles: 2,
      multiples: 1,
      minutes: 40,
      pass: 3,
    }, identity);

    expect(order).toEqual(["s1", "s2", "m1"]);
  });

  it("produces a shorter paper when the bank has fewer questions", () => {
    const order = buildExamPaper([question("s1")], {
      total: 40,
      singles: 32,
      multiples: 8,
      minutes: 40,
      pass: 30,
    }, identity);

    expect(order).toEqual(["s1"]);
  });

  it("passes the combined paper through the final randomizer", () => {
    const order = buildExamPaper(
      [question("s1"), question("s2"), question("m1", [1, 2], "multiple")],
      { total: 3, singles: 2, multiples: 1, minutes: 40, pass: 2 },
      <T,>(items: T[]) => [...items].reverse(),
    );

    expect(order).toEqual(["m1", "s1", "s2"]);
  });
});

describe("scoreExam", () => {
  const items = [
    question("A", [1]),
    question("B", [1]),
    question("C", [1]),
    question("D", [1, 2], "multiple"),
  ];
  const byKey = mapOf(items);

  it("counts correct answers and separates wrong from unanswered", () => {
    const result = scoreExam(
      ["A", "B", "C", "D"],
      byKey,
      { A: [1], B: [2], C: [], D: [1] },
    );

    expect(result.score).toBe(1);
    expect(result.answeredCount).toBe(3);
    expect(result.wrongKeys).toEqual(["B", "C", "D"]);
    expect(result.wrongAnswered.map((item) => item.key)).toEqual(["B", "D"]);
  });

  it("treats answer order as irrelevant", () => {
    const result = scoreExam(["D"], byKey, { D: [2, 1] });

    expect(result.score).toBe(1);
    expect(result.wrongKeys).toEqual([]);
    expect(result.wrongAnswered).toEqual([]);
  });

  it("skips keys that are no longer in the bank", () => {
    const result = scoreExam(["A", "X"], byKey, { A: [1], X: [1] });

    expect(result.score).toBe(1);
    expect(result.wrongKeys).toEqual([]);
  });
});

describe("review helpers", () => {
  const byKey = mapOf([question("A"), question("B")]);

  it("lists every question not answered correctly", () => {
    expect(wrongKeysOf(["A", "B"], byKey, { A: [1], B: [] })).toEqual(["B"]);
    expect(wrongKeysOf(["A", "B"], byKey, {})).toEqual(["A", "B"]);
  });

  it("counts only questions with a selection", () => {
    expect(answeredCountOf(["A", "B"], { A: [1], B: [] })).toBe(1);
  });
});

describe("canResumeExam", () => {
  const now = 1_000;

  it("resumes a live paper whose questions still exist", () => {
    expect(canResumeExam(["A", "B"], now + 1, new Set(["A", "B", "C"]), now)).toBe(true);
  });

  it("rejects an expired paper", () => {
    expect(canResumeExam(["A"], now, new Set(["A"]), now)).toBe(false);
  });

  it("rejects a paper with a missing question", () => {
    expect(canResumeExam(["A", "X"], now + 1, new Set(["A"]), now)).toBe(false);
  });

  it("rejects an empty paper", () => {
    expect(canResumeExam([], now + 1, new Set(["A"]), now)).toBe(false);
  });
});
