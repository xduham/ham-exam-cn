/* SPDX-License-Identifier: MPL-2.0 */

import { describe, expect, it } from "vitest";
import { makeQuestion } from "../test-helpers";
import type { QuestionOption } from "../types";
import {
  displayAnswerKeys,
  isCorrect,
  optionLabel,
  orderedOptions,
  questionSnippet,
  resolveExplanation,
} from "./questions";

const multi = makeQuestion({
  key: "A-0001",
  code: "MC2-0001",
  answer_keys: [1, 3],
  type: "multiple",
});

const displayed: QuestionOption[] = [
  { key: 2, text: "乙" },
  { key: 1, text: "甲" },
  { key: 3, text: "丙" },
  { key: 4, text: "丁" },
];

describe("isCorrect", () => {
  it("compares answer sets regardless of order", () => {
    expect(isCorrect(multi, [3, 1])).toBe(true);
    expect(isCorrect(multi, [1])).toBe(false);
    expect(isCorrect(multi, [])).toBe(false);
  });
});

describe("display labels", () => {
  it("maps answer ids and explanation tokens to the display order", () => {
    expect(displayAnswerKeys(multi, displayed)).toEqual(["B", "C"]);
    expect(optionLabel(0)).toBe("A");
    expect(optionLabel(3)).toBe("D");
    expect(resolveExplanation("{{1}}和{{3}}，故{{1,3}}正确", displayed)).toBe("B和C，故BC正确");
  });

  it("leaves explanations without tokens unchanged", () => {
    expect(resolveExplanation("A 类与 D 层是技术字母", displayed)).toBe("A 类与 D 层是技术字母");
  });
});

describe("orderedOptions", () => {
  it("is deterministic and does not keep the source order", () => {
    const first = orderedOptions(multi, 42).map((option) => option.key);
    const second = orderedOptions(multi, 42).map((option) => option.key);

    expect(first).toEqual(second);
    expect(first).not.toEqual([1, 2, 3, 4]);
    expect([...first].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe("questionSnippet", () => {
  it("collapses whitespace and truncates", () => {
    expect(questionSnippet(makeQuestion({ key: "A", question: "一  二\n三" }))).toBe("一 二 三");
    expect(questionSnippet(makeQuestion({ key: "A", question: "一二三四五" }), 3)).toBe("一二三…");
  });
});
