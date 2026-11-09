/* SPDX-License-Identifier: MPL-2.0 */

import type { Question, QuestionOption } from "../types";
import { hashString, seededShuffle } from "../utils";

/**
 * Shuffle option order for display. Option keys are stable content IDs, not
 * display letters; labels are assigned from the display position.
 */
export function orderedOptions(question: Question, seed: number): QuestionOption[] {
  if (question.options.length < 2) return question.options;
  const shuffled = seededShuffle(question.options, (seed ^ hashString(question.key)) >>> 0);
  if (shuffled.every((option, index) => option.key === question.options[index].key)) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

export function optionLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function labelMap(options: QuestionOption[]): Map<number, string> {
  return new Map(options.map((option, index) => [option.key, optionLabel(index)]));
}

export function displayAnswerKeys(question: Question, options: QuestionOption[]): string[] {
  const labels = labelMap(options);
  return question.answer_keys
    .map((key) => labels.get(key))
    .filter((label): label is string => Boolean(label))
    .sort();
}

const EXPLANATION_TOKEN = /\{\{(\d+(?:,\d+)*)\}\}/g;

/** Replace {{id}} / {{id,id}} tokens with the labels of the current display order. */
export function resolveExplanation(text: string, options: QuestionOption[]): string {
  if (!text.includes("{{")) return text;
  const labels = labelMap(options);
  return text.replace(EXPLANATION_TOKEN, (_, body: string) => {
    const resolved = body
      .split(",")
      .map(Number)
      .map((key) => labels.get(key))
      .filter((label): label is string => Boolean(label))
      .sort();
    return resolved.length > 0 ? resolved.join("") : "?";
  });
}

export function isCorrect(question: Question, selected: number[]): boolean {
  return sortedKeys(selected).join(",") === sortedKeys(question.answer_keys).join(",");
}

function sortedKeys(keys: number[]): number[] {
  return [...keys].sort((left, right) => left - right);
}

export function questionLabel(question: Question): string {
  return question.number ?? question.key;
}

export function questionSnippet(question: Question, length = 90): string {
  const text = question.question.replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
