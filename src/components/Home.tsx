/* SPDX-License-Identifier: MPL-2.0 */

import { favoriteCount, wrongCount } from "../collections";
import { PRACTICE_LABELS } from "../labels";
import { BANK_META, ruleFor } from "../rules";
import { isExamActive, loadExam, loadPractice } from "../storage";
import { loadStats, practiceAccuracy } from "../stats";
import type { Bank, PracticeKind } from "../types";
import { formatDuration } from "../utils";
import { BankPicker } from "./BankPicker";

type Props = {
  bank: Bank;
  onBankChange: (bank: Bank) => void;
  onPractice: (kind: PracticeKind) => void;
  onExam: () => void;
  onWrong: () => void;
  onFavorites: () => void;
  onStats: () => void;
};

export function Home({
  bank,
  onBankChange,
  onPractice,
  onExam,
  onWrong,
  onFavorites,
  onStats,
}: Props) {
  const practice = loadPractice(bank);
  const exam = loadExam(bank);
  const examActive = isExamActive(exam);
  const stats = loadStats()[bank];
  const accuracy = practiceAccuracy(stats);
  const rule = ruleFor(bank);
  const wrong = wrongCount(bank);
  const favorites = favoriteCount(bank);
  const practiceVisible =
    practice &&
    (practice.kind !== "wrong" || wrong > 0) &&
    (practice.kind !== "favorite" || favorites > 0);

  return (
    <div className="stack">
      <section className="card home-hero">
        <h1 className="hero-title">业余无线电操作证考试练习</h1>
        <p className="hero-sub">
          选择 A / B / C 类题库，按真实规则练习或模拟考试。答案、解析与助记都在本地，随时可用。
        </p>
        <BankPicker value={bank} onChange={onBankChange} />
        <p className="muted small">
          {BANK_META[bank].label}：{BANK_META[bank].rule}。{BANK_META[bank].hint}。
        </p>
      </section>

      {practiceVisible || examActive ? (
        <section className="stack" aria-label="继续上次">
          {practiceVisible && practice ? (
            <div className="card resume-card">
              <div>
                <strong>继续{PRACTICE_LABELS[practice.kind]}</strong>
                <p className="muted small">
                  {BANK_META[bank].label} · 第 {practice.index + 1} / {practice.order.length} 题
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => onPractice(practice.kind)}>
                继续
              </button>
            </div>
          ) : null}
          {examActive && exam ? (
            <div className="card resume-card">
              <div>
                <strong>继续模拟考试</strong>
                <p className="muted small">
                  {BANK_META[bank].label} · 剩余 {formatDuration(exam.endAtMs - Date.now())}
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={onExam}>
                继续
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="home-actions" aria-label="开始练习">
        <button type="button" className="btn btn-primary btn-lg" onClick={() => onPractice("sequential")}>
          顺序练习
        </button>
        <button type="button" className="btn btn-secondary btn-lg" onClick={() => onPractice("random")}>
          随机练习
        </button>
        <button type="button" className="btn btn-secondary btn-lg" onClick={onExam}>
          模拟考试
          <span className="btn-sub">{rule.total} 题 · {rule.minutes} 分钟</span>
        </button>
      </section>

      <section className="feature-grid" aria-label="学习工具">
        <button type="button" className="card feature-card" onClick={onWrong}>
          <span className="feature-value">{wrong}</span>
          <span className="feature-label">错题本</span>
          <span className="feature-hint">答错的题自动收录</span>
        </button>
        <button type="button" className="card feature-card" onClick={onFavorites}>
          <span className="feature-value">{favorites}</span>
          <span className="feature-label">收藏</span>
          <span className="feature-hint">星标题目随时回看</span>
        </button>
        <button type="button" className="card feature-card" onClick={onStats}>
          <span className="feature-value">{accuracy}%</span>
          <span className="feature-label">练习正确率</span>
          <span className="feature-hint">
            {stats.practiceAnswered} 题 · 模考最佳 {stats.examBest} 分
          </span>
        </button>
      </section>

      <p className="muted small center">
        所有答题数据仅保存在本机浏览器，不上传服务器。
      </p>
    </div>
  );
}
