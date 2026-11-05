/* SPDX-License-Identifier: MPL-2.0 */

import { useEffect, useMemo, useRef, useState } from "react";
import { addWrong } from "../collections";
import { isCorrect, loadBank } from "../data";
import { BANK_META, ruleFor } from "../rules";
import { clearExam, loadExam, saveExam } from "../storage";
import { recordExam } from "../stats";
import type { Bank, Question } from "../types";
import { formatDuration, shuffle } from "../utils";
import { AnswerSheet } from "./AnswerSheet";
import { ProgressBar } from "./ProgressBar";
import { QuestionCard } from "./QuestionCard";
import { Result } from "./Result";

type Props = {
  bank: Bank;
  onExit: () => void;
  onOpenWrong: () => void;
};

type ExamResult = {
  score: number;
  order: string[];
  answers: Record<string, string[]>;
  autoSubmitted: boolean;
};

export function Exam({ bank, onExit, onOpenWrong }: Props) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [order, setOrder] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [endAtMs, setEndAtMs] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [index, setIndex] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReady(false);

    loadBank(bank)
      .then((loaded) => {
        if (cancelled) return;
        const byKey = new Map(loaded.map((question) => [question.key, question]));
        const saved = loadExam(bank);

        if (saved && saved.endAtMs > Date.now()) {
          const validOrder = saved.order.filter((key) => byKey.has(key));
          if (validOrder.length === saved.order.length) {
            setQuestions(loaded);
            setOrder(saved.order);
            setAnswers(saved.answers);
            setFlags(saved.flags);
            setEndAtMs(saved.endAtMs);
            setStartedAt(saved.startedAt);
            setReady(true);
            setLoading(false);
            return;
          }
        }

        const rule = ruleFor(bank);
        const singles = shuffle(loaded.filter((question) => question.type === "single")).slice(
          0,
          rule.singles,
        );
        const multiples = shuffle(
          loaded.filter((question) => question.type === "multiple"),
        ).slice(0, rule.multiples);
        const picked = shuffle([...singles, ...multiples]).map((question) => question.key);
        const started = Date.now();

        setQuestions(loaded);
        setOrder(picked);
        setAnswers({});
        setFlags({});
        setStartedAt(started);
        setEndAtMs(started + rule.minutes * 60_000);
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
  }, [bank]);

  useEffect(() => {
    if (!ready || finished || order.length === 0) return;
    saveExam({ bank, order, answers, flags, endAtMs, startedAt });
  }, [ready, finished, bank, order, answers, flags, endAtMs, startedAt]);

  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

  useEffect(() => {
    if (!ready || finished || endAtMs === 0) return;
    if (Date.now() >= endAtMs) handleSubmit(true);
  }, [now, ready, finished, endAtMs]);

  useEffect(() => {
    if (finished) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [finished]);

  const byKey = useMemo(
    () => new Map((questions ?? []).map((question) => [question.key, question])),
    [questions],
  );
  const currentKey = order[index] ?? null;
  const currentQuestion = currentKey ? byKey.get(currentKey) : undefined;
  const selected = currentKey ? (answers[currentKey] ?? []) : [];
  const answeredCount = order.filter((key) => (answers[key] ?? []).length > 0).length;
  const remaining = endAtMs ? Math.max(0, endAtMs - now) : 0;
  const rule = ruleFor(bank);

  function handleSelect(optionKey: string): void {
    if (!currentQuestion || finished) return;
    const next =
      currentQuestion.type === "single"
        ? [optionKey]
        : selected.includes(optionKey)
          ? selected.filter((key) => key !== optionKey)
          : [...selected, optionKey];
    setAnswers((previous) => ({ ...previous, [currentQuestion.key]: next }));
  }

  function toggleFlag(): void {
    if (!currentKey) return;
    setFlags((previous) => ({ ...previous, [currentKey]: !previous[currentKey] }));
  }

  function jumpTo(key: string): void {
    const position = order.indexOf(key);
    if (position >= 0) {
      setIndex(position);
      setSheetOpen(false);
    }
  }

  function handleSubmit(auto = false): void {
    if (submittedRef.current || finished || !questions || order.length === 0) return;
    if (!auto && !window.confirm("确定交卷吗？未作答的题目按错误计算。")) return;
    submittedRef.current = true;

    let score = 0;
    for (const key of order) {
      const question = byKey.get(key);
      if (!question) continue;
      const chosen = answers[key] ?? [];
      if (isCorrect(question, chosen)) {
        score += 1;
      } else if (chosen.length > 0) {
        addWrong(bank, question);
      }
    }

    recordExam(bank, score, score >= rule.pass);
    clearExam(bank);
    setResult({ score, order: [...order], answers: { ...answers }, autoSubmitted: auto });
    setFinished(true);
    setSheetOpen(false);
  }

  function handleExit(): void {
    if (finished) {
      onExit();
      return;
    }
    if (!window.confirm("退出后本次考试进度会保存，下次可以继续。确定退出？")) return;
    if (questions && order.length > 0) {
      saveExam({ bank, order, answers, flags, endAtMs, startedAt });
    }
    onExit();
  }

  if (loading) {
    return <p className="loading">正在组卷…</p>;
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
    return (
      <div className="card empty">
        <p>题库暂不可用，无法组卷。</p>
        <button type="button" className="btn btn-primary" onClick={onExit}>
          返回首页
        </button>
      </div>
    );
  }

  if (finished && result) {
    return (
      <Result
        bank={bank}
        questions={questions}
        order={result.order}
        answers={result.answers}
        score={result.score}
        autoSubmitted={result.autoSubmitted}
        onExit={onExit}
        onOpenWrong={onOpenWrong}
      />
    );
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
        <button type="button" className="btn btn-danger" onClick={() => handleSubmit(false)}>
          交卷
        </button>
      </div>

      <div className="card exam-status">
        <div className="row between">
          <span>剩余时间</span>
          <span className={remaining <= 60_000 ? "timer low" : "timer"} aria-live="polite">
            {formatDuration(remaining)}
          </span>
        </div>
        <ProgressBar value={(answeredCount / order.length) * 100} />
        <div className="row between muted small">
          <span>
            已答 {answeredCount} / {order.length}
          </span>
          <span>
            第 {index + 1} / {order.length} 题
          </span>
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        selected={selected}
        revealed={false}
        onSelect={handleSelect}
      />

      {sheetOpen ? (
        <AnswerSheet
          questions={questions}
          order={order}
          answers={answers}
          flags={flags}
          currentKey={currentKey}
          onJump={jumpTo}
        />
      ) : null}

      <div className="bottom-bar bottom-bar-4">
        <button
          type="button"
          className="btn"
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          disabled={index === 0}
        >
          上一题
        </button>
        <button
          type="button"
          className={flags[currentKey ?? ""] ? "btn btn-secondary" : "btn"}
          onClick={toggleFlag}
        >
          {flags[currentKey ?? ""] ? "已标记" : "标记"}
        </button>
        <button type="button" className="btn" onClick={() => setSheetOpen((value) => !value)}>
          {sheetOpen ? "收起" : "答题卡"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setIndex((value) => Math.min(order.length - 1, value + 1))}
          disabled={index >= order.length - 1}
        >
          下一题
        </button>
      </div>
    </div>
  );
}
