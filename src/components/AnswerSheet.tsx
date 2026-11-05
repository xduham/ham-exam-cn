/* SPDX-License-Identifier: MPL-2.0 */

import type { Question } from "../types";
import { classNames } from "../utils";

type Props = {
  questions: Question[];
  order: string[];
  answers: Record<string, string[]>;
  flags: Record<string, boolean>;
  currentKey: string | null;
  onJump: (key: string) => void;
};

export function AnswerSheet({ questions, order, answers, flags, currentKey, onJump }: Props) {
  const byKey = new Map(questions.map((question) => [question.key, question]));

  return (
    <section className="card answer-sheet" aria-label="答题卡">
      <div className="row between">
        <h2 className="section-title">答题卡</h2>
        <span className="muted small">
          已答 {order.filter((key) => (answers[key] ?? []).length > 0).length} / {order.length}
        </span>
      </div>
      <div className="sheet-grid">
        {order.map((key, index) => {
          const question = byKey.get(key);
          const answered = (answers[key] ?? []).length > 0;
          const flagged = Boolean(flags[key]);
          return (
            <button
              key={key}
              type="button"
              className={classNames(
                "sheet-item",
                answered && "answered",
                flagged && "flagged",
                key === currentKey && "current",
              )}
              onClick={() => onJump(key)}
              title={question?.number ?? key}
              aria-label={`第 ${index + 1} 题${answered ? "，已答" : "，未答"}${flagged ? "，已标记" : ""}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span><i className="legend-dot answered" />已答</span>
        <span><i className="legend-dot flagged" />标记</span>
        <span><i className="legend-dot current" />当前</span>
      </div>
    </section>
  );
}
