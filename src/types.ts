/* SPDX-License-Identifier: MPL-2.0 */

export type Bank = "A" | "B" | "C";

export type QuestionType = "single" | "multiple";

export type QuestionOption = {
  key: string;
  text: string;
};

export type Question = {
  key: string;
  number: string | null;
  code: string | null;
  question: string;
  options: QuestionOption[];
  answer_keys: string[];
  type: QuestionType;
  imageUrl: string | null;
  explanation?: string;
  mnemonic?: string;
};

export type View = "home" | "practice" | "exam" | "wrong" | "favorites" | "stats";

export type PracticeKind = "sequential" | "random" | "wrong" | "favorite";
