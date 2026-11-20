/* SPDX-License-Identifier: MPL-2.0 */

import {
  displayAnswerKeys,
  orderedOptions,
  resolveExplanation,
} from "../domain/questions";
import { SHOW_EXPLANATIONS } from "../features";
import type { Question } from "../types";

type Props = {
  question: Question;
  optionSeed?: number;
};

export function ExplanationCard({ question, optionSeed }: Props) {
  const mnemonic = question.mnemonic?.trim();
  if (!SHOW_EXPLANATIONS && !mnemonic) return null;

  const options =
    typeof optionSeed === "number" ? orderedOptions(question, optionSeed) : question.options;
  const explanation =
    SHOW_EXPLANATIONS && question.explanation
      ? resolveExplanation(question.explanation, options)
      : undefined;
  const answerLabels = SHOW_EXPLANATIONS ? displayAnswerKeys(question, options) : [];

  return (
    <section
      className="card explanation"
      aria-label={SHOW_EXPLANATIONS ? "答案解析" : "助记"}
    >
      <div className="explanation-head">
        <h2 className="section-title">{SHOW_EXPLANATIONS ? "答案解析" : "助记"}</h2>
        {SHOW_EXPLANATIONS ? (
          <span className="badge badge-muted">{answerLabels.join("、")}</span>
        ) : null}
      </div>
      {SHOW_EXPLANATIONS ? (
        explanation ? (
          <p>{explanation}</p>
        ) : (
          <p className="muted">暂无解析。</p>
        )
      ) : null}
      {mnemonic ? (
        <div className="mnemonic">
          <strong>助记：</strong>
          {mnemonic}
        </div>
      ) : null}
    </section>
  );
}
