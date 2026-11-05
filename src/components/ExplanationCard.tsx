/* SPDX-License-Identifier: MPL-2.0 */

import type { Question } from "../types";

type Props = {
  question: Question;
};

export function ExplanationCard({ question }: Props) {
  const explanation = question.explanation?.trim();
  const mnemonic = question.mnemonic?.trim();

  return (
    <section className="card explanation" aria-label="答案解析">
      <div className="explanation-head">
        <h2 className="section-title">答案解析</h2>
        <span className="badge badge-muted">{question.answer_keys.join("、")}</span>
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
