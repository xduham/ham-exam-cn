/* SPDX-License-Identifier: MPL-2.0 */

import { describe, expect, it } from "vitest";
import { identity, makeQuestion } from "../test-helpers";
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
  type: Question["type"] = "single",
): Question {
  return makeQuestion({ key, answer_keys: answerKeys, type });
}

function mapOf(items: Question[]): Map<string, Question> {
  return new Map(items.map((item) => [item.key, item]));
}

const noFloors = { minImages: 0, minPerChapter: 0, minMultiplesPerChapter: 0 };

describe("buildExamPaper", () => {
  it("takes the configured counts with singles before multiples", () => {
    const singles = ["s1", "s2", "s3"].map((key) => question(key));
    const multiples = ["m1", "m2"].map((key) => question(key, [1, 2], "multiple"));

    const order = buildExamPaper([...singles, ...multiples], {
      total: 4,
      singles: 2,
      multiples: 1,
      minutes: 40,
      pass: 3,
    }, noFloors, identity);

    expect(order).toEqual(["s1", "s2", "m1"]);
  });

  it("produces a shorter paper when the bank has fewer questions", () => {
    const order = buildExamPaper([question("s1")], {
      total: 40,
      singles: 32,
      multiples: 8,
      minutes: 40,
      pass: 30,
    }, noFloors, identity);

    expect(order).toEqual(["s1"]);
  });
});

describe("scoreExam", () => {
  const byKey = mapOf([
    question("A", [1]),
    question("B", [1]),
    question("C", [1]),
    question("D", [1, 2], "multiple"),
  ]);

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

  it("reports wrong keys and counts only answered questions", () => {
    expect(wrongKeysOf(["A", "B"], byKey, { A: [1], B: [] })).toEqual(["B"]);
    expect(wrongKeysOf(["A", "B"], byKey, {})).toEqual(["A", "B"]);
    expect(answeredCountOf(["A", "B"], { A: [1], B: [] })).toBe(1);
  });
});

describe("canResumeExam", () => {
  it("requires a live paper whose questions still exist", () => {
    const now = 1_000;
    const live = new Set(["A", "B"]);

    expect(canResumeExam(["A", "B"], now + 1, live, now)).toBe(true);
    expect(canResumeExam(["A", "B"], now, live, now)).toBe(false); // expired
    expect(canResumeExam(["A", "X"], now + 1, live, now)).toBe(false); // missing question
    expect(canResumeExam([], now + 1, live, now)).toBe(false); // empty paper
  });
});
