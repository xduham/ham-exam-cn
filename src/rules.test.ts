/* SPDX-License-Identifier: MPL-2.0 */

import { describe, expect, it } from "vitest";
import { buildExamPaper } from "./domain/exam";
import { RULES } from "./rules";
import type { Bank, Question } from "./types";

function question(key: string, type: "single" | "multiple"): Question {
  return {
    key,
    number: key,
    code: null,
    question: key,
    options: [
      { key: 1, text: "甲" },
      { key: 2, text: "乙" },
    ],
    answer_keys: type === "single" ? [1] : [1, 2],
    type,
    imageUrl: null,
  };
}

const identity = <T,>(items: T[]): T[] => [...items];

describe("fixed exam blueprint", () => {
  it("matches the published counts", () => {
    expect(RULES.A).toMatchObject({
      singles: 32,
      multiples: 8,
      total: 40,
      minutes: 40,
      pass: 30,
    });
    expect(RULES.B).toMatchObject({
      singles: 45,
      multiples: 15,
      total: 60,
      minutes: 60,
      pass: 45,
    });
    expect(RULES.C).toMatchObject({
      singles: 70,
      multiples: 20,
      total: 90,
      minutes: 90,
      pass: 70,
    });
  });

  it("derives total from singles and multiples", () => {
    for (const bank of ["A", "B", "C"] as Bank[]) {
      expect(RULES[bank].total).toBe(RULES[bank].singles + RULES[bank].multiples);
    }
  });

  it.each(["A", "B", "C"] as Bank[])(
    "draws exactly the blueprinted number of %s questions",
    (bank) => {
      const rule = RULES[bank];
      const questions = [
        ...Array.from({ length: rule.singles + 5 }, (_, index) =>
          question(`${bank}-s${index}`, "single"),
        ),
        ...Array.from({ length: rule.multiples + 5 }, (_, index) =>
          question(`${bank}-m${index}`, "multiple"),
        ),
      ];

      const order = buildExamPaper(questions, rule, identity);
      const byKey = new Map(questions.map((item) => [item.key, item]));
      const types = order.map((key) => byKey.get(key)?.type);
      const counts = { single: 0, multiple: 0 };
      for (const type of types) {
        if (type) counts[type] += 1;
      }

      expect(order).toHaveLength(rule.total);
      expect(counts).toEqual({
        single: rule.singles,
        multiple: rule.multiples,
      });
      expect(types).toEqual([
        ...Array.from({ length: rule.singles }, () => "single"),
        ...Array.from({ length: rule.multiples }, () => "multiple"),
      ]);
      expect(new Set(order).size).toBe(order.length);
    },
  );
});
