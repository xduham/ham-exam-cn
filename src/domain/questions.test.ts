/* SPDX-License-Identifier: MPL-2.0 */

import { describe, expect, it } from "vitest";
import type { Question, QuestionOption } from "../types";
import {
  displayAnswerKeys,
  isCorrect,
  optionLabel,
  orderedOptions,
  questionSnippet,
  resolveExplanation,
} from "./questions";

function question(overrides: Partial<Question> = {}): Question {
  return {
    key: "A-0001",
    number: "MC2-0001",
    code: "MC2-0001",
    question: "以下说法正确的是？",
    options: [
      { key: 1, text: "甲" },
      { key: 2, text: "乙" },
      { key: 3, text: "丙" },
      { key: 4, text: "丁" },
    ],
    answer_keys: [1, 3],
    type: "multiple",
    imageUrl: null,
    ...overrides,
  };
}

const displayed: QuestionOption[] = [
  { key: 2, text: "乙" },
  { key: 1, text: "甲" },
  { key: 3, text: "丙" },
  { key: 4, text: "丁" },
];

describe("isCorrect", () => {
  it("compares answer sets regardless of order", () => {
    expect(isCorrect(question(), [3, 1])).toBe(true);
    expect(isCorrect(question(), [1])).toBe(false);
    expect(isCorrect(question(), [])).toBe(false);
  });
});

describe("display labels", () => {
  it("maps answer ids to the current display position", () => {
    expect(displayAnswerKeys(question(), displayed)).toEqual(["B", "C"]);
    expect(optionLabel(0)).toBe("A");
    expect(optionLabel(3)).toBe("D");
  });

  it("resolves explanation tokens against the display order", () => {
    expect(resolveExplanation("{{1}}和{{3}}，故{{1,3}}正确", displayed)).toBe(
      "B和C，故BC正确",
    );
  });

  it("leaves explanations without tokens unchanged", () => {
    expect(resolveExplanation("A 类与 D 层是技术字母", displayed)).toBe(
      "A 类与 D 层是技术字母",
    );
  });
});

describe("orderedOptions", () => {
  it("is deterministic for a question and seed", () => {
    const first = orderedOptions(question(), 42);
    const second = orderedOptions(question(), 42);

    expect(first.map((option) => option.key)).toEqual(second.map((option) => option.key));
  });

  it("does not leave the source order untouched", () => {
    const order = orderedOptions(question(), 42).map((option) => option.key);

    expect(order).not.toEqual([1, 2, 3, 4]);
    expect([...order].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("questionSnippet", () => {
  it("collapses whitespace and truncates", () => {
    expect(questionSnippet(question({ question: "一  二\n三" }))).toBe("一 二 三");
    expect(questionSnippet(question({ question: "一二三四五" }), 3)).toBe("一二三…");
  });
});
