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

const noFloors = {
  minImages: 0,
  minPerChapter: 0,
  minMultiplesPerChapter: 0,
  minNewLevel: 0,
  maxFourAnswerMultiples: 99,
};

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

describe("new-level floor", () => {
  const composition = {
    minImages: 0,
    minPerChapter: 2,
    minMultiplesPerChapter: 1,
    minNewLevel: 4,
    maxFourAnswerMultiples: 99,
  };
  const rule = { singles: 6, multiples: 3, total: 9, minutes: 40, pass: 7 };
  const questions: Question[] = [
    ...Array.from({ length: 8 }, (_, index) =>
      makeQuestion({ key: `old-s${index}`, section: "1.1.1", level: "A" }),
    ),
    ...Array.from({ length: 8 }, (_, index) =>
      makeQuestion({ key: `new-s${index}`, section: "2.1.1", level: "B" }),
    ),
    ...Array.from({ length: 2 }, (_, index) =>
      makeQuestion({
        key: `old-m${index}`,
        section: "1.1.1",
        type: "multiple",
        answer_keys: [1, 2],
        level: "A",
      }),
    ),
    ...Array.from({ length: 4 }, (_, index) =>
      makeQuestion({
        key: `new-m${index}`,
        section: "2.1.1",
        type: "multiple",
        answer_keys: [1, 2],
        level: "B",
      }),
    ),
  ];
  const byKey = mapOf(questions);

  function draw(minNewLevel: number): Question[] {
    const order = buildExamPaper(
      questions,
      rule,
      { ...composition, minNewLevel },
      identity,
      "B",
    );
    return order.map((key) => byKey.get(key)!);
  }

  it("reserves questions of the target level", () => {
    const paper = draw(composition.minNewLevel);

    expect(paper).toHaveLength(rule.total);
    // A floor is a minimum: leftover chapter-2 slots can also land on new material.
    expect(paper.filter((item) => item.level === "B").length).toBeGreaterThanOrEqual(
      composition.minNewLevel,
    );
    expect(paper.filter((item) => item.type === "single")).toHaveLength(rule.singles);
  });

  it("caps the floor at the available supply", () => {
    const paper = draw(99);

    // Only the five new-level slots in chapter 2 can satisfy the floor.
    expect(paper.filter((item) => item.level === "B")).toHaveLength(5);
    expect(paper).toHaveLength(rule.total);
    expect(paper.filter((item) => item.type === "multiple")).toHaveLength(rule.multiples);
  });
});

describe("four-answer multiples", () => {
  it("swaps within the chapter to stay under the cap", () => {
    const questions = [
      ...Array.from({ length: 4 }, (_, index) =>
        makeQuestion({
          key: `four-${index}`,
          section: "1.1.1",
          type: "multiple",
          answer_keys: [1, 2, 3, 4],
        }),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        makeQuestion({
          key: `two-${index}`,
          section: "1.1.1",
          type: "multiple",
          answer_keys: [1, 2],
        }),
      ),
    ];
    const order = buildExamPaper(
      questions,
      { singles: 0, multiples: 4, total: 4, minutes: 10, pass: 3 },
      { ...noFloors, maxFourAnswerMultiples: 1 },
      identity,
    );
    const byKey = mapOf(questions);
    const paper = order.map((key) => byKey.get(key)!);

    expect(paper).toHaveLength(4);
    expect(paper.filter((item) => item.answer_keys.length === 4)).toHaveLength(1);
    expect(paper.filter((item) => item.answer_keys.length === 2)).toHaveLength(3);
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
