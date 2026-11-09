/* SPDX-License-Identifier: MPL-2.0 */

import { useState } from "react";
import { usePracticeSession } from "../hooks/usePracticeSession";
import { PRACTICE_LABELS } from "../labels";
import type { Bank, PracticeKind } from "../types";
import { ExplanationCard } from "./ExplanationCard";
import { ProgressBar } from "./ProgressBar";
import { QuestionCard } from "./QuestionCard";
import { SearchPanel } from "./SearchPanel";

type Props = {
  bank: Bank;
  kind: PracticeKind;
  onExit: () => void;
};

export function Practice({ bank, kind, onExit }: Props) {
  const session = usePracticeSession(bank, kind);
  const [searchOpen, setSearchOpen] = useState(false);

  if (session.status === "loading") {
    return <p className="loading">加载题库中…</p>;
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

  const current = session.current;
  if (!current) {
    const emptyText =
      kind === "wrong"
        ? "错题本是空的。先去练习或考试，答错的题会自动收录。"
        : kind === "favorite"
          ? "还没有收藏题目。练习时点题目右上角的星标即可收藏。"
          : "题库暂不可用。";
    return (
      <div className="card empty">
        <p>{emptyText}</p>
        <button type="button" className="btn btn-primary" onClick={onExit}>
          返回首页
        </button>
      </div>
    );
  }

  const { question, selected, revealed, favorite } = current;
  const optionSeed = session.settings.shuffleOptions ? session.optionSeed : undefined;
  const isLast = session.index >= session.total - 1;

  function jumpTo(key: string): void {
    session.actions.jumpTo(key);
    setSearchOpen(false);
  }

  function finish(): void {
    session.actions.finish();
    onExit();
  }

  return (
    <div className="view">
      <div className="view-head">
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          ← 返回
        </button>
        <div className="view-title-wrap">
          <h1 className="view-title">{PRACTICE_LABELS[kind]}</h1>
        </div>
        {kind === "sequential" ? (
          <button type="button" className="btn btn-secondary" onClick={() => setSearchOpen(true)}>
            搜索
          </button>
        ) : (
          <span />
        )}
      </div>

      <div className="card progress-card">
        <div className="row between">
          <span>
            第 {session.index + 1} / {session.total} 题
          </span>
          <span className="muted small">已答 {session.answeredCount} 题</span>
        </div>
        <div className="progress-slider">
          <ProgressBar value={((session.index + 1) / session.total) * 100} />
          <input
            className="progress-range"
            type="range"
            min={1}
            max={session.total}
            value={session.index + 1}
            aria-label="拖动跳转题目"
            onChange={(event) => session.actions.jumpToIndex(Number(event.target.value) - 1)}
          />
        </div>
      </div>

      <div className="practice-scroll">
        <QuestionCard
          question={question}
          selected={selected}
          revealed={revealed}
          onSelect={session.actions.select}
          optionSeed={optionSeed}
          favorite={favorite}
          onToggleFavorite={session.actions.toggleFavorite}
        />

        {revealed ? <ExplanationCard question={question} optionSeed={optionSeed} /> : null}
      </div>

      <div className="practice-tools">
        <div className="switch-group">
          <label className="switch">
            <input
              type="checkbox"
              checked={session.settings.autoCheck}
              onChange={(event) => session.actions.setAutoCheck(event.target.checked)}
            />
            即时判题
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={session.settings.shuffleOptions}
              onChange={(event) => session.actions.setShuffleOptions(event.target.checked)}
            />
            选项乱序
          </label>
        </div>
        <span className="muted small">
          {question.type === "multiple" ? "多选题选完后查看答案" : "单选题选完查看答案"}
        </span>
      </div>

      <div className={revealed ? "bottom-bar bottom-bar-2" : "bottom-bar bottom-bar-3"}>
        <button type="button" className="btn" onClick={session.actions.prev} disabled={session.index === 0}>
          上一题
        </button>
        {!revealed ? (
          <button type="button" className="btn btn-primary" onClick={session.actions.check}>
            查看答案
          </button>
        ) : null}
        {isLast ? (
          <button type="button" className="btn btn-secondary" onClick={finish}>
            完成
          </button>
        ) : (
          <button type="button" className="btn" onClick={session.actions.next}>
            下一题
          </button>
        )}
      </div>

      {searchOpen ? (
        <SearchPanel
          questions={session.questions}
          onJump={jumpTo}
          onClose={() => setSearchOpen(false)}
        />
      ) : null}
    </div>
  );
}
