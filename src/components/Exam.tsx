/* SPDX-License-Identifier: MPL-2.0 */

import { useState } from "react";
import { useExamSession } from "../hooks/useExamSession";
import { BANK_META, ruleFor } from "../rules";
import type { Bank } from "../types";
import { formatDuration } from "../utils";
import { AnswerSheet } from "./AnswerSheet";
import { ProgressBar } from "./ProgressBar";
import { QuestionCard } from "./QuestionCard";
import { Result } from "./Result";

type Props = {
  bank: Bank;
  onExit: () => void;
  onOpenWrong: () => void;
};

export function Exam({ bank, onExit, onOpenWrong }: Props) {
  const session = useExamSession(bank);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (session.status === "loading") {
    return <p className="loading">正在组卷…</p>;
  }

  if (session.status === "error") {
    return (
      <div className="card error">
        <p>{session.error}</p>
        <button type="button" className="btn" onClick={onExit}>
          返回首页
        </button>
      </div>
    );
  }

  if (session.result) {
    return (
      <Result
        bank={bank}
        questions={session.questions}
        order={session.result.order}
        answers={session.result.answers}
        score={session.result.score}
        autoSubmitted={session.result.autoSubmitted}
        optionSeed={session.result.optionSeed}
        onExit={onExit}
        onOpenWrong={onOpenWrong}
      />
    );
  }

  const current = session.current;
  if (!current) {
    return (
      <div className="card empty">
        <p>题库暂不可用，无法组卷。</p>
        <button type="button" className="btn btn-primary" onClick={onExit}>
          返回首页
        </button>
      </div>
    );
  }

  const { question, selected, flagged } = current;
  const rule = ruleFor(bank);

  function handleExit(): void {
    if (!window.confirm("退出后本次考试进度会保存，下次可以继续。确定退出？")) {
      return;
    }
    session.actions.saveProgress();
    onExit();
  }

  function jumpTo(key: string): void {
    session.actions.jumpTo(key);
    setSheetOpen(false);
  }

  return (
    <div className="view">
      <div className="view-head">
        <button type="button" className="btn btn-ghost" onClick={handleExit}>
          ← 退出
        </button>
        <div className="view-title-wrap">
          <h1 className="view-title">模拟考试</h1>
          <p className="muted small">
            {BANK_META[bank].label} · {rule.total} 题 · 合格 {rule.pass} 分
          </p>
        </div>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => session.actions.submit(false)}
        >
          交卷
        </button>
      </div>

      <div className="card exam-status">
        <div className="row between">
          <span>剩余时间</span>
          <span
            className={session.remainingMs <= 60_000 ? "timer low" : "timer"}
            aria-live="polite"
          >
            {formatDuration(session.remainingMs)}
          </span>
        </div>
        <ProgressBar value={(session.answeredCount / session.total) * 100} />
        <div className="row between muted small">
          <span>
            已答 {session.answeredCount} / {session.total}
          </span>
          <span>
            第 {session.index + 1} / {session.total} 题
          </span>
        </div>
      </div>

      <QuestionCard
        question={question}
        selected={selected}
        revealed={false}
        onSelect={session.actions.select}
        optionSeed={session.optionSeed}
      />

      {sheetOpen ? (
        <AnswerSheet
          questions={session.questions}
          order={session.order}
          answers={session.answers}
          flags={session.flags}
          currentKey={session.currentKey}
          onJump={jumpTo}
        />
      ) : null}

      <div className="bottom-bar bottom-bar-4">
        <button
          type="button"
          className="btn"
          onClick={session.actions.prev}
          disabled={session.index === 0}
        >
          上一题
        </button>
        <button
          type="button"
          className={flagged ? "btn btn-secondary" : "btn"}
          onClick={session.actions.toggleFlag}
        >
          {flagged ? "已标记" : "标记"}
        </button>
        <button type="button" className="btn" onClick={() => setSheetOpen((value) => !value)}>
          {sheetOpen ? "收起" : "答题卡"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={session.actions.next}
          disabled={session.index >= session.total - 1}
        >
          下一题
        </button>
      </div>
    </div>
  );
}
