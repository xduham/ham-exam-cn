/* SPDX-License-Identifier: MPL-2.0 */

import { useMemo, useState } from "react";
import { isCorrect, questionLabel } from "../data";
import { BANK_META, ruleFor } from "../rules";
import type { Bank, Question } from "../types";
import { classNames } from "../utils";
import { ExplanationCard } from "./ExplanationCard";
import { QuestionCard } from "./QuestionCard";

type Props = {
  bank: Bank;
  questions: Question[];
  order: string[];
  answers: Record<string, number[]>;
  score: number;
  autoSubmitted: boolean;
  optionSeed: number;
  onExit: () => void;
  onOpenWrong: () => void;
};

export function Result({
  bank,
  questions,
  order,
  answers,
  score,
  autoSubmitted,
  optionSeed,
  onExit,
  onOpenWrong,
}: Props) {
  const [filter, setFilter] = useState<"wrong" | "all">("wrong");
  const rule = ruleFor(bank);
  const passed = score >= rule.pass;
  const byKey = useMemo(
    () => new Map(questions.map((question) => [question.key, question])),
    [questions],
  );

  const wrongKeys = order.filter((key) => {
    const question = byKey.get(key);
    return question ? !isCorrect(question, answers[key] ?? []) : false;
  });
  const answeredCount = order.filter((key) => (answers[key] ?? []).length > 0).length;
  const displayKeys = filter === "wrong" ? wrongKeys : order;

  return (
    <div className="view">
      <div className="view-head">
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          ← 返回首页
        </button>
        <div className="view-title-wrap">
          <h1 className="view-title">考试结果</h1>
          <p className="muted small">
            {BANK_META[bank].label} · 合格线 {rule.pass} 分
          </p>
        </div>
        <span />
      </div>

      <section className="card result-summary">
        {autoSubmitted ? <div className="banner">时间到，已自动交卷。</div> : null}
        <div className="score-row">
          <div className={classNames("score", passed ? "pass" : "fail")}>
            {score}
            <span>/{rule.total}</span>
          </div>
          <div>
            <span className={classNames("badge", passed ? "badge-success" : "badge-danger")}>
              {passed ? "合格" : "未合格"}
            </span>
            <p className="muted small">正确 {score} 题，错误 / 未答 {wrongKeys.length} 题</p>
          </div>
        </div>

        <div className="result-stats">
          <div>
            <strong>{score}</strong>
            <span>正确</span>
          </div>
          <div>
            <strong>{wrongKeys.length}</strong>
            <span>错误 / 未答</span>
          </div>
          <div>
            <strong>{order.length - answeredCount}</strong>
            <span>未作答</span>
          </div>
        </div>

        <div className="row gap wrap">
          <button type="button" className="btn btn-primary" onClick={onExit}>
            返回首页
          </button>
          <button type="button" className="btn btn-secondary" onClick={onOpenWrong}>
            查看错题本
          </button>
        </div>
      </section>

      <div className="filter-tabs" role="tablist" aria-label="结果筛选">
        <button
          type="button"
          role="tab"
          aria-selected={filter === "wrong"}
          className={classNames("filter-tab", filter === "wrong" && "active")}
          onClick={() => setFilter("wrong")}
        >
          只看错题（{wrongKeys.length}）
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === "all"}
          className={classNames("filter-tab", filter === "all" && "active")}
          onClick={() => setFilter("all")}
        >
          全部题目（{order.length}）
        </button>
      </div>

      <div className="review-list">
        {displayKeys.map((key) => {
          const question = byKey.get(key);
          if (!question) return null;
          const chosen = answers[key] ?? [];
          const correct = isCorrect(question, chosen);
          const position = order.indexOf(key);
          return (
            <div className="review-item" key={key}>
              <div className="row between">
                <span className={classNames("badge", correct ? "badge-success" : "badge-danger")}>
                  {correct ? "正确" : chosen.length > 0 ? "错误" : "未作答"}
                </span>
                <span className="muted small">{questionLabel(question)}</span>
              </div>
              <QuestionCard
                question={question}
                selected={chosen}
                revealed
                onSelect={() => undefined}
                index={position}
                total={order.length}
                optionSeed={optionSeed}
                readOnly
              />
              <ExplanationCard question={question} optionSeed={optionSeed} />
            </div>
          );
        })}
        {displayKeys.length === 0 ? (
          <div className="card empty">
            <p>{filter === "wrong" ? "全部答对，没有错题。" : "没有可显示的题目。"}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
