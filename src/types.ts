/* SPDX-License-Identifier: MPL-2.0 */

export type Bank = "A" | "B" | "C";

export type QuestionType = "single" | "multiple";

export type QuestionOption = {
  key: number;
  text: string;
};

export type Question = {
  key: string;
  number: string | null;
  code: string | null;
  question: string;
  options: QuestionOption[];
  answer_keys: number[];
  type: QuestionType;
  imageUrl: string | null;
  explanation?: string;
  mnemonic?: string;
};

export type PracticeKind = "sequential" | "random" | "wrong" | "favorite";
