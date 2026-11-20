/* SPDX-License-Identifier: MPL-2.0 */

import type { ExamComposition, ExamRule } from "../rules";
import type { Question } from "../types";
import { isCorrect } from "./questions";

export type ExamScore = {
  score: number;
  answeredCount: number;
  /** Every question not answered correctly, including unanswered ones. */
  wrongKeys: string[];
  /** Answered incorrectly; these are the ones that enter the wrong book. */
  wrongAnswered: Question[];
};

type Pool = {
  singles: Question[];
  multiples: Question[];
  images: Question[];
};

const identity = <T,>(items: T[]): T[] => [...items];

export function chapterOf(question: Question): string {
  return question.section?.split(".")[0] || "?";
}

function groupPools(questions: Question[]): Map<string, Pool> {
  const pools = new Map<string, Pool>();
  for (const question of questions) {
    const chapter = chapterOf(question);
    let pool = pools.get(chapter);
    if (!pool) {
      pool = { singles: [], multiples: [], images: [] };
      pools.set(chapter, pool);
    }
    if (question.type === "single") {
      pool.singles.push(question);
      if (question.imageUrl) pool.images.push(question);
    } else {
      pool.multiples.push(question);
    }
  }
  return pools;
}

function sumValues(counts: Record<string, number>): number {
  return Object.values(counts).reduce((total, value) => total + value, 0);
}

/**
 * Largest-remainder allocation with capacity caps. Returns quotas that sum to
 * min(total, total capacity); callers fill any shortfall separately.
 */
function allocate(total: number, capacities: Record<string, number>): Record<string, number> {
  const quota: Record<string, number> = {};
  const keys = Object.keys(capacities).filter((key) => capacities[key] > 0);
  const capacity = keys.reduce((sum, key) => sum + capacities[key], 0);
  const target = Math.min(Math.max(0, total), capacity);
  if (target === 0) return quota;

  const exact = new Map(
    keys.map((key) => [key, (target * capacities[key]) / capacity]),
  );
  let assigned = 0;
  for (const key of keys) {
    const value = Math.min(capacities[key], Math.floor(exact.get(key) ?? 0));
    quota[key] = value;
    assigned += value;
  }

  let remaining = target - assigned;
  while (remaining > 0) {
    let best: string | null = null;
    let bestDeficit = -Infinity;
    for (const key of keys) {
      if ((quota[key] ?? 0) >= capacities[key]) continue;
      const deficit = (exact.get(key) ?? 0) - (quota[key] ?? 0);
      if (
        deficit > bestDeficit ||
        (deficit === bestDeficit && best !== null && key < best)
      ) {
        bestDeficit = deficit;
        best = key;
      }
    }
    if (best === null) break;
    quota[best] = (quota[best] ?? 0) + 1;
    remaining -= 1;
  }
  return quota;
}

/**
 * Reserved floors can exceed the fixed paper counts only if a caller supplies
 * an infeasible composition. Trim image extras first, then any remaining
 * counts, so the paper still has the requested size.
 */
function trimCounts(
  counts: Record<string, number>,
  imageCounts: Record<string, number>,
  limit: number,
): void {
  let excess = Math.max(0, sumValues(counts) - limit);
  if (excess === 0) return;

  for (const chapter of Object.keys(imageCounts)) {
    while (excess > 0 && (imageCounts[chapter] ?? 0) > 0 && (counts[chapter] ?? 0) > 0) {
      imageCounts[chapter] -= 1;
      counts[chapter] -= 1;
      excess -= 1;
    }
  }
  for (const chapter of Object.keys(counts)) {
    while (excess > 0 && counts[chapter] > 0) {
      counts[chapter] -= 1;
      excess -= 1;
    }
  }
}

/**
 * Draw a paper with the fixed counts and sampling floors:
 * - every chapter gets `minPerChapter` questions, including at least
 *   `minMultiplesPerChapter` multiple-choice questions where available;
 * - at least `minImages` image questions;
 * - remaining slots are proportional to each chapter's supply;
 * - singles run before multiples, with each group shuffled.
 *
 * Banks smaller than the rule produce a shorter paper.
 */
export function buildExamPaper(
  questions: Question[],
  rule: ExamRule,
  composition: ExamComposition,
  randomize: <T>(items: T[]) => T[] = identity,
): string[] {
  const pools = groupPools(questions);
  const chapters = [...pools.keys()];

  const singleCounts: Record<string, number> = {};
  const multipleCounts: Record<string, number> = {};
  for (const chapter of chapters) {
    const pool = pools.get(chapter)!;
    const multiples = Math.min(composition.minMultiplesPerChapter, pool.multiples.length);
    const singles = Math.min(
      Math.max(0, composition.minPerChapter - multiples),
      pool.singles.length,
    );
    multipleCounts[chapter] = multiples;
    singleCounts[chapter] = singles;
  }

  // Reserve the required image questions, then let them count toward the
  // chapter's single-choice floor.
  const imageCounts: Record<string, number> = {};
  let imagesLeft = composition.minImages;
  const imagePool = randomize([...pools.values()].flatMap((pool) => pool.images));
  for (const question of imagePool) {
    if (imagesLeft <= 0) break;
    const chapter = chapterOf(question);
    imageCounts[chapter] = (imageCounts[chapter] ?? 0) + 1;
    imagesLeft -= 1;
  }
  for (const chapter of chapters) {
    singleCounts[chapter] = Math.min(
      pools.get(chapter)!.singles.length,
      Math.max(singleCounts[chapter], imageCounts[chapter] ?? 0),
    );
  }

  trimCounts(singleCounts, imageCounts, rule.singles);
  trimCounts(multipleCounts, {}, rule.multiples);

  const singleExtra = allocate(
    rule.singles - sumValues(singleCounts),
    Object.fromEntries(
      chapters.map((chapter) => [
        chapter,
        Math.max(0, pools.get(chapter)!.singles.length - singleCounts[chapter]),
      ]),
    ),
  );
  const multipleExtra = allocate(
    rule.multiples - sumValues(multipleCounts),
    Object.fromEntries(
      chapters.map((chapter) => [
        chapter,
        Math.max(0, pools.get(chapter)!.multiples.length - multipleCounts[chapter]),
      ]),
    ),
  );

  const selectedSingles: Question[] = [];
  const selectedMultiples: Question[] = [];
  for (const chapter of chapters) {
    const pool = pools.get(chapter)!;
    const singleCount = singleCounts[chapter] + (singleExtra[chapter] ?? 0);
    const multipleCount = multipleCounts[chapter] + (multipleExtra[chapter] ?? 0);
    const imageCount = Math.min(imageCounts[chapter] ?? 0, singleCount);

    const chosenImages = randomize(pool.images).slice(0, imageCount);
    const chosenImageKeys = new Set(chosenImages.map((question) => question.key));
    const otherSingles = randomize(
      pool.singles.filter((question) => !chosenImageKeys.has(question.key)),
    );
    selectedSingles.push(
      ...chosenImages,
      ...otherSingles.slice(0, singleCount - chosenImages.length),
    );
    selectedMultiples.push(...randomize(pool.multiples).slice(0, multipleCount));
  }

  // If a chapter ran out of capacity, fill the remaining slots from the rest
  // of the bank. This only adds questions, so the chapter floors still hold.
  const selectedKeys = new Set(
    [...selectedSingles, ...selectedMultiples].map((question) => question.key),
  );
  const fill = (list: Question[], type: Question["type"], target: number): void => {
    if (list.length >= target) return;
    const candidates = randomize(
      questions.filter(
        (question) => question.type === type && !selectedKeys.has(question.key),
      ),
    );
    for (const question of candidates) {
      if (list.length >= target) break;
      list.push(question);
      selectedKeys.add(question.key);
    }
  };
  fill(selectedSingles, "single", rule.singles);
  fill(selectedMultiples, "multiple", rule.multiples);

  return [...randomize(selectedSingles), ...randomize(selectedMultiples)].map(
    (question) => question.key,
  );
}

export function scoreExam(
  order: string[],
  byKey: ReadonlyMap<string, Question>,
  answers: Record<string, number[]>,
): ExamScore {
  let score = 0;
  let answeredCount = 0;
  const wrongKeys: string[] = [];
  const wrongAnswered: Question[] = [];

  for (const key of order) {
    const question = byKey.get(key);
    if (!question) continue;

    const chosen = answers[key] ?? [];
    if (chosen.length > 0) answeredCount += 1;

    if (isCorrect(question, chosen)) {
      score += 1;
    } else {
      wrongKeys.push(key);
      if (chosen.length > 0) wrongAnswered.push(question);
    }
  }

  return { score, answeredCount, wrongKeys, wrongAnswered };
}

export function wrongKeysOf(
  order: string[],
  byKey: ReadonlyMap<string, Question>,
  answers: Record<string, number[]>,
): string[] {
  const keys: string[] = [];
  for (const key of order) {
    const question = byKey.get(key);
    if (question && !isCorrect(question, answers[key] ?? [])) keys.push(key);
  }
  return keys;
}

export function answeredCountOf(
  order: string[],
  answers: Record<string, number[]>,
): number {
  return order.filter((key) => (answers[key] ?? []).length > 0).length;
}

/**
 * An exam can be resumed only while its deadline is in the future and every
 * saved question still exists in the current bank.
 */
export function canResumeExam(
  order: string[],
  endAtMs: number,
  validKeys: ReadonlySet<string> | ReadonlyMap<string, unknown>,
  now: number,
): boolean {
  return order.length > 0 && endAtMs > now && order.every((key) => validKeys.has(key));
}
