/* SPDX-License-Identifier: MPL-2.0 */

import { displayAnswerKeys, orderedOptions, resolveExplanation } from "../data";
import type { Question } from "../types";

type Props = {
  question: Question;
  optionSeed?: number;
};

export function ExplanationCard({ question, optionSeed }: Props) {
  const options =
    typeof optionSeed === "number" ? orderedOptions(question, optionSeed) : question.options;
  const explanation = question.explanation
    ? resolveExplanation(question.explanation, options)
    : undefined;
  const mnemonic = question.mnemonic?.trim();
  const answerLabels = displayAnswerKeys(question, options);

  return (
    <section className="card explanation" aria-label="答案解析">
      <div className="explanation-head">
        <h2 className="section-title">答案解析</h2>
        <span className="badge badge-muted">{answerLabels.join("、")}</span>
      </div>
      {explanation ? <p>{explanation}</p> : <p className="muted">暂无解析。</p>}
      {mnemonic ? (
        <div className="mnemonic">
          <strong>助记：</strong>
          {mnemonic}
        </div>
      ) : null}
    </section>
  );
}
