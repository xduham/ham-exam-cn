/* SPDX-License-Identifier: MPL-2.0 */

import { useEffect, useMemo, useState } from "react";
import {
  addWrong,
  favoriteEntries,
  isFavorite,
  removeWrong,
  toggleFavorite,
  wrongEntries,
} from "../collections";
import { isCorrect, loadBank } from "../data";
import { PRACTICE_LABELS } from "../labels";
import { BANK_META } from "../rules";
import { clearPractice, loadPractice, savePractice } from "../storage";
import { recordPractice } from "../stats";
import type { Bank, PracticeKind, Question } from "../types";
import { randomSeed, shuffle } from "../utils";
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
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [revealedKeys, setRevealedKeys] = useState<string[]>([]);
  const [autoCheck, setAutoCheck] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [optionSeed, setOptionSeed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [, forceRender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReady(false);

    loadBank(bank)
      .then((loaded) => {
        if (cancelled) return;
        const byKey = new Map(loaded.map((question) => [question.key, question]));
        let nextOrder: string[];

        if (kind === "wrong") {
          nextOrder = wrongEntries(bank).map((entry) => entry.key);
        } else if (kind === "favorite") {
          nextOrder = favoriteEntries(bank).map((entry) => entry.key);
        } else {
          nextOrder = loaded.map((question) => question.key);
        }

        nextOrder = nextOrder.filter((key) => byKey.has(key));
        if (kind === "random") nextOrder = shuffle(nextOrder);

        const saved = loadPractice(bank);
        const canResume =
          saved &&
          saved.kind === kind &&
          (kind === "sequential" ||
            kind === "random" ||
            saved.revealedKeys.length < saved.order.length);
        let nextIndex = 0;
        let nextAnswers: Record<string, number[]> = {};
        let nextRevealed: string[] = [];
        let nextAuto = false;
        let nextShuffle = true;
        let nextOptionSeed = randomSeed();

        if (canResume) {
          const savedOrder = saved.order.filter((key) => byKey.has(key));
          if (kind === "sequential") {
            nextOrder = loaded.map((question) => question.key);
          } else if (kind === "random") {
            if (savedOrder.length > 0) nextOrder = savedOrder;
          } else {
            const current = new Set(nextOrder);
            const shared = savedOrder.filter((key) => current.has(key));
            const extras = nextOrder.filter((key) => !shared.includes(key));
            nextOrder = [...shared, ...extras];
          }
          nextIndex = Math.min(saved.index, Math.max(0, nextOrder.length - 1));
          nextAnswers = Object.fromEntries(
            Object.entries(saved.answers).filter(([key]) => byKey.has(key)),
          );
          nextRevealed = saved.revealedKeys.filter((key) => byKey.has(key));
          nextAuto = saved.autoCheck;
          nextShuffle = saved.shuffleOptions !== false;
          nextOptionSeed = saved.optionSeed || randomSeed();
        }

        setQuestions(loaded);
        setOrder(nextOrder);
        setIndex(nextIndex);
        setAnswers(nextAnswers);
        setRevealedKeys(nextRevealed);
        setAutoCheck(nextAuto);
        setShuffleOptions(nextShuffle);
        setOptionSeed(nextOptionSeed);
        setReady(true);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [bank, kind]);

  useEffect(() => {
    if (!ready || order.length === 0) return;
    savePractice({
      bank,
      kind,
      order,
      index,
      answers,
      revealedKeys,
      autoCheck,
      shuffleOptions,
      optionSeed,
      updatedAt: Date.now(),
    });
  }, [
    ready,
    bank,
    kind,
    order,
    index,
    answers,
    revealedKeys,
    autoCheck,
    shuffleOptions,
    optionSeed,
  ]);

  const byKey = useMemo(
    () => new Map((questions ?? []).map((question) => [question.key, question])),
    [questions],
  );
  const currentKey = order[index] ?? null;
  const currentQuestion = currentKey ? byKey.get(currentKey) : undefined;
  const selected = currentKey ? (answers[currentKey] ?? []) : [];
  const revealed = currentKey ? revealedKeys.includes(currentKey) : false;
  const answeredCount = order.filter((key) => (answers[key] ?? []).length > 0).length;

  function reveal(question: Question, chosen: number[]): void {
    if (revealedKeys.includes(question.key)) return;
    const correct = isCorrect(question, chosen);
    recordPractice(bank, correct);
    if (correct) {
      if (kind === "wrong") removeWrong(bank, question.key);
    } else {
      addWrong(bank, question);
    }
    setRevealedKeys((previous) => [...previous, question.key]);
  }

  function handleSelect(optionKey: number): void {
    if (!currentQuestion || revealed) return;
    const next =
      currentQuestion.type === "single"
        ? [optionKey]
        : selected.includes(optionKey)
          ? selected.filter((key) => key !== optionKey)
          : [...selected, optionKey];

    setAnswers((previous) => ({ ...previous, [currentQuestion.key]: next }));
    if (autoCheck && currentQuestion.type === "single") reveal(currentQuestion, next);
  }

  function handleCheck(): void {
    if (!currentQuestion) return;
    if (selected.length === 0) {
      setRevealedKeys((previous) => [...previous, currentQuestion.key]);
      return;
    }
    reveal(currentQuestion, selected);
  }

  function handleToggleFavorite(): void {
    if (!currentQuestion) return;
    toggleFavorite(bank, currentQuestion);
    forceRender((value) => value + 1);
  }

  function goPrev(): void {
    setIndex((value) => Math.max(0, value - 1));
  }

  function goNext(): void {
    setIndex((value) => Math.min(order.length - 1, value + 1));
  }

  function jumpTo(key: string): void {
    const position = order.indexOf(key);
    if (position >= 0) {
      setIndex(position);
      setSearchOpen(false);
    }
  }

  function handleFinish(): void {
    clearPractice(bank);
    onExit();
  }

  if (loading) {
    return <p className="loading">加载题库中…</p>;
  }

  if (error) {
    return (
      <div className="card error">
        <p>{error}</p>
        <button type="button" className="btn" onClick={onExit}>
          返回首页
        </button>
      </div>
    );
  }

  if (!questions || order.length === 0 || !currentQuestion) {
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

  const favorite = isFavorite(bank, currentQuestion.key);
  const isLast = index >= order.length - 1;

  return (
    <div className="view">
      <div className="view-head">
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          ← 返回
        </button>
        <div className="view-title-wrap">
          <h1 className="view-title">{PRACTICE_LABELS[kind]}</h1>
          <p className="muted small">
            {BANK_META[bank].label} · {order.length} 题 · {BANK_META[bank].hint}
          </p>
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
            第 {index + 1} / {order.length} 题
          </span>
          <span className="muted small">已答 {answeredCount} 题</span>
        </div>
        <div className="progress-slider">
          <ProgressBar value={((index + 1) / order.length) * 100} />
          <input
            className="progress-range"
            type="range"
            min={1}
            max={order.length}
            value={index + 1}
            aria-label="拖动跳转题目"
            onChange={(event) => setIndex(Number(event.target.value) - 1)}
          />
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        selected={selected}
        revealed={revealed}
        onSelect={handleSelect}
        optionSeed={shuffleOptions ? optionSeed : undefined}
        favorite={favorite}
        onToggleFavorite={handleToggleFavorite}
      />

      {revealed ? (
        <ExplanationCard
          question={currentQuestion}
          optionSeed={shuffleOptions ? optionSeed : undefined}
        />
      ) : null}

      <div className="practice-tools">
        <div className="switch-group">
          <label className="switch">
            <input
              type="checkbox"
              checked={autoCheck}
              onChange={(event) => setAutoCheck(event.target.checked)}
            />
            即时判题
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={shuffleOptions}
              onChange={(event) => setShuffleOptions(event.target.checked)}
            />
            选项乱序
          </label>
        </div>
        <span className="muted small">
          {currentQuestion.type === "multiple" ? "多选题选完后查看答案" : "单选题选完查看答案"}
        </span>
      </div>

      <div className={revealed ? "bottom-bar" : "bottom-bar bottom-bar-3"}>
        <button type="button" className="btn" onClick={goPrev} disabled={index === 0}>
          上一题
        </button>
        {!revealed ? (
          <button type="button" className="btn btn-primary" onClick={handleCheck}>
            查看答案
          </button>
        ) : null}
        {isLast ? (
          <button type="button" className="btn btn-secondary" onClick={handleFinish}>
            完成
          </button>
        ) : (
          <button type="button" className="btn" onClick={goNext}>
            下一题
          </button>
        )}
      </div>

      {searchOpen ? (
        <SearchPanel
          questions={questions}
          onJump={jumpTo}
          onClose={() => setSearchOpen(false)}
        />
      ) : null}
    </div>
  );
}
