/* SPDX-License-Identifier: MPL-2.0 */

import { useCallback, useEffect, useRef, useState } from "react";
import { buildExamPaper, canResumeExam, scoreExam } from "../domain/exam";
import { compositionFor, ruleFor } from "../rules";
import { clearExam, loadExam, saveExam } from "../storage";
import { recordExam } from "../stats";
import type { Bank, Question } from "../types";
import { moveIndex, randomSeed, shuffle } from "../utils";
import { useBank } from "./useBank";
import { useCollections } from "./useCollections";

type Session = {
  bank: Bank;
  order: string[];
  answers: Record<string, number[]>;
  flags: Record<string, boolean>;
  index: number;
  endAtMs: number;
  startedAt: number;
  optionSeed: number;
};

export type ExamResult = {
  score: number;
  order: string[];
  answers: Record<string, number[]>;
  autoSubmitted: boolean;
  optionSeed: number;
};

export type ExamSessionStatus = "loading" | "error" | "ready";

export type ExamSession = {
  status: ExamSessionStatus;
  error: string | null;
  questions: Question[];
  current: {
    question: Question;
    selected: number[];
    flagged: boolean;
  } | null;
  currentKey: string | null;
  index: number;
  total: number;
  order: string[];
  answers: Record<string, number[]>;
  flags: Record<string, boolean>;
  answeredCount: number;
  remainingMs: number;
  optionSeed: number;
  result: ExamResult | null;
  actions: {
    select: (optionKey: number) => void;
    toggleFlag: () => void;
    prev: () => void;
    next: () => void;
    jumpTo: (key: string) => void;
    submit: (auto?: boolean) => boolean;
    saveProgress: () => void;
  };
};

/**
 * Exam lifecycle: loading -> paper running -> submitted (manual or automatic).
 * A saved paper resumes only while its deadline is in the future and every
 * saved question still exists in the bank.
 */
export function useExamSession(bank: Bank): ExamSession {
  const bankResource = useBank(bank);
  const { recordWrong } = useCollections(bank);
  const [paper, setPaper] = useState<Session | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const paperRef = useRef<Session | null>(null);
  const submittedRef = useRef(false);

  function activePaper(): Session | null {
    const current = paperRef.current;
    return current && current.bank === bank ? current : null;
  }

  function updatePaper(next: Session): void {
    paperRef.current = next;
    setPaper(next);
  }

  useEffect(() => {
    if (bankResource.status !== "ready") {
      paperRef.current = null;
      setPaper(null);
      setResult(null);
      return;
    }

    const saved = loadExam(bank);
    const started = Date.now();

    if (saved && canResumeExam(saved.order, saved.endAtMs, bankResource.byKey, started)) {
      const next: Session = {
        bank,
        order: saved.order,
        answers: saved.answers,
        flags: saved.flags,
        index: saved.index,
        endAtMs: saved.endAtMs,
        startedAt: saved.startedAt,
        optionSeed: saved.optionSeed || randomSeed(),
      };
      submittedRef.current = false;
      updatePaper(next);
      setResult(null);
      return;
    }

    const rule = ruleFor(bank);
    const next: Session = {
      bank,
      order: buildExamPaper(
        bankResource.questions,
        rule,
        compositionFor(bank),
        shuffle,
      ),
      answers: {},
      flags: {},
      index: 0,
      startedAt: started,
      endAtMs: started + rule.minutes * 60_000,
      optionSeed: randomSeed(),
    };
    submittedRef.current = false;
    updatePaper(next);
    setResult(null);
  }, [bank, bankResource.status, bankResource.questions]);

  useEffect(() => {
    if (!paper || result || paper.order.length === 0) return;
    saveExam({
      bank,
      order: paper.order,
      index: paper.index,
      answers: paper.answers,
      flags: paper.flags,
      endAtMs: paper.endAtMs,
      startedAt: paper.startedAt,
      optionSeed: paper.optionSeed,
    });
  }, [bank, paper, result]);

  useEffect(() => {
    if (result) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [result]);

  const submit = useCallback(
    (auto = false): boolean => {
      const current = paperRef.current;
      if (submittedRef.current || !current || current.bank !== bank || result) {
        return false;
      }
      if (!auto && !window.confirm("确定交卷吗？未作答的题目按错误计算。")) {
        return false;
      }

      submittedRef.current = true;
      const scored = scoreExam(current.order, bankResource.byKey, current.answers);
      for (const question of scored.wrongAnswered) recordWrong(question);
      recordExam(bank, scored.score, scored.score >= ruleFor(bank).pass);
      clearExam(bank);
      setResult({
        score: scored.score,
        order: [...current.order],
        answers: { ...current.answers },
        autoSubmitted: auto,
        optionSeed: current.optionSeed,
      });
      return true;
    },
    [bank, bankResource.byKey, recordWrong, result],
  );

  useEffect(() => {
    if (!paper || result) return;
    if (Date.now() >= paper.endAtMs) submit(true);
  }, [now, paper, result, submit]);

  const active = paper && paper.bank === bank ? paper : null;
  const currentKey = active ? (active.order[active.index] ?? null) : null;
  const currentQuestion = currentKey ? bankResource.byKey.get(currentKey) : undefined;
  const selected = active && currentKey ? (active.answers[currentKey] ?? []) : [];
  const flagged = active && currentKey ? Boolean(active.flags[currentKey]) : false;
  const answeredCount = active
    ? active.order.filter((key) => (active.answers[key] ?? []).length > 0).length
    : 0;

  const status: ExamSessionStatus =
    bankResource.status === "error"
      ? "error"
      : bankResource.status === "ready" && active
        ? "ready"
        : "loading";

  function select(optionKey: number): void {
    const current = activePaper();
    if (!current || result) return;
    const key = current.order[current.index];
    const question = key ? bankResource.byKey.get(key) : undefined;
    if (!key || !question) return;

    const chosen = current.answers[key] ?? [];
    const nextSelected =
      question.type === "single"
        ? [optionKey]
        : chosen.includes(optionKey)
          ? chosen.filter((item) => item !== optionKey)
          : [...chosen, optionKey];

    updatePaper({
      ...current,
      answers: { ...current.answers, [key]: nextSelected },
    });
  }

  function toggleFlag(): void {
    const current = activePaper();
    if (!current) return;
    const key = current.order[current.index];
    if (!key) return;
    updatePaper({
      ...current,
      flags: { ...current.flags, [key]: !current.flags[key] },
    });
  }

  function move(delta: number): void {
    const current = activePaper();
    if (!current) return;
    updatePaper({
      ...current,
      index: moveIndex(current.index, delta, current.order.length),
    });
  }

  function jumpTo(key: string): void {
    const current = activePaper();
    if (!current) return;
    const index = current.order.indexOf(key);
    if (index >= 0) updatePaper({ ...current, index });
  }

  const saveProgress = useCallback((): void => {
    const current = paperRef.current;
    if (!current || current.bank !== bank || current.order.length === 0) return;
    saveExam({
      bank,
      order: current.order,
      index: current.index,
      answers: current.answers,
      flags: current.flags,
      endAtMs: current.endAtMs,
      startedAt: current.startedAt,
      optionSeed: current.optionSeed,
    });
  }, [bank]);

  return {
    status,
    error: bankResource.error,
    questions: bankResource.questions,
    current: currentQuestion
      ? { question: currentQuestion, selected, flagged }
      : null,
    currentKey,
    index: active?.index ?? 0,
    total: active?.order.length ?? 0,
    order: active?.order ?? [],
    answers: active?.answers ?? {},
    flags: active?.flags ?? {},
    answeredCount,
    remainingMs: active ? Math.max(0, active.endAtMs - now) : 0,
    optionSeed: active?.optionSeed ?? 0,
    result,
    actions: {
      select,
      toggleFlag,
      prev: () => move(-1),
      next: () => move(1),
      jumpTo,
      submit,
      saveProgress,
    },
  };
}
