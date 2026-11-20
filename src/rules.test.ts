/* SPDX-License-Identifier: MPL-2.0 */

import { describe, expect, it } from "vitest";
import { buildExamPaper, chapterOf } from "./domain/exam";
import { COMPOSITION, RULES, compositionFor } from "./rules";
import { identity, makeQuestion } from "./test-helpers";
import type { Bank, Question } from "./types";

describe("fixed exam blueprint", () => {
  it("matches the published counts", () => {
    expect(RULES.A).toMatchObject({ singles: 32, multiples: 8, total: 40, minutes: 40, pass: 30 });
    expect(RULES.B).toMatchObject({ singles: 45, multiples: 15, total: 60, minutes: 60, pass: 45 });
    expect(RULES.C).toMatchObject({ singles: 70, multiples: 20, total: 90, minutes: 90, pass: 70 });
  });

  it("matches the composition floors", () => {
    expect(COMPOSITION.A).toEqual({ minImages: 1, minPerChapter: 2, minMultiplesPerChapter: 1 });
    expect(COMPOSITION.B).toEqual({ minImages: 2, minPerChapter: 2, minMultiplesPerChapter: 1 });
    expect(COMPOSITION.C).toEqual({ minImages: 4, minPerChapter: 2, minMultiplesPerChapter: 1 });
  });

  it.each(["A", "B", "C"] as Bank[])(
    "draws the full paper and honors every floor for %s",
    (bank) => {
      const rule = RULES[bank];
      const composition = COMPOSITION[bank];
      const chapters = ["1", "2", "3", "4", "5"];
      const questions: Question[] = [];
      let imagesLeft = composition.minImages;

      // Enough supply per chapter that the exact blueprint counts always fit.
      for (const chapter of chapters) {
        for (let index = 0; index < 30; index += 1) {
          const key = `s-${chapter}-${index}`;
          const isImage = imagesLeft > 0 && (chapter === "3" || chapter === "4");
          if (isImage) imagesLeft -= 1;
          questions.push(
            makeQuestion({
              key,
              section: `${chapter}.1.1`,
              imageUrl: isImage ? `images/${key}.jpg` : null,
            }),
          );
        }
        for (let index = 0; index < 10; index += 1) {
          questions.push(
            makeQuestion({
              key: `m-${chapter}-${index}`,
              section: `${chapter}.1.1`,
              type: "multiple",
              answer_keys: [1, 2],
            }),
          );
        }
      }

      const order = buildExamPaper(questions, rule, composition, identity);
      const byKey = new Map(questions.map((item) => [item.key, item]));
      const counts = { single: 0, multiple: 0 };
      const chapterCounts: Record<string, { total: number; multiple: number }> = {};
      for (const chapter of chapters) chapterCounts[chapter] = { total: 0, multiple: 0 };
      let images = 0;

      for (const key of order) {
        const item = byKey.get(key);
        if (!item) continue;
        counts[item.type] += 1;
        chapterCounts[chapterOf(item)].total += 1;
        if (item.type === "multiple") chapterCounts[chapterOf(item)].multiple += 1;
        if (item.imageUrl) images += 1;
      }

      expect(order).toHaveLength(rule.total);
      expect(new Set(order).size).toBe(order.length);
      expect(counts).toEqual({ single: rule.singles, multiple: rule.multiples });
      expect(order.slice(0, rule.singles).every((key) => byKey.get(key)?.type === "single")).toBe(true);
      expect(images).toBeGreaterThanOrEqual(composition.minImages);
      for (const chapter of chapters) {
        expect(chapterCounts[chapter].total).toBeGreaterThanOrEqual(composition.minPerChapter);
        expect(chapterCounts[chapter].multiple).toBeGreaterThanOrEqual(
          composition.minMultiplesPerChapter,
        );
      }
    },
  );
});
