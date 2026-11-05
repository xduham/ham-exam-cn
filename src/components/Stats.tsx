/* SPDX-License-Identifier: MPL-2.0 */

import { clearAppData } from "../storage";
import { BANK_META, ruleFor } from "../rules";
import { loadStats, practiceAccuracy } from "../stats";
import type { Bank } from "../types";
import { percent } from "../utils";

const BANKS: Bank[] = ["A", "B", "C"];

type Props = {
  onExit: () => void;
};

function lastActive(timestamp: number): string {
  if (!timestamp) return "还没有记录";
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Stats({ onExit }: Props) {
  const stats = loadStats();

  function reset(): void {
    if (!window.confirm("确定清空全部本地学习数据？包括练习进度、考试进度、错题本、收藏和统计。")) {
      return;
    }
    clearAppData();
    window.location.reload();
  }

  return (
    <div className="view">
      <div className="view-head">
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          ← 返回
        </button>
        <div className="view-title-wrap">
          <h1 className="view-title">学习统计</h1>
          <p className="muted small">统计保存在本机浏览器，仅用于自测参考。</p>
        </div>
        <span />
      </div>

      <div className="stack">
        {BANKS.map((bank) => {
          const item = stats[bank];
          const accuracy = practiceAccuracy(item);
          const total = ruleFor(bank).total;
          return (
            <section className="card stat-card" key={bank}>
              <div className="row between">
                <h2 className="section-title">{BANK_META[bank].label}</h2>
                <span className="muted small">{lastActive(item.lastActiveAt)}</span>
              </div>
              <div className="stat-grid">
                <div>
                  <strong>{item.practiceAnswered}</strong>
                  <span>练习答题</span>
                </div>
                <div>
                  <strong>{accuracy}%</strong>
                  <span>练习正确率</span>
                </div>
                <div>
                  <strong>{item.examAttempts}</strong>
                  <span>模考次数</span>
                </div>
                <div>
                  <strong>
                    {item.examBest}
                    <small>/{total}</small>
                  </strong>
                  <span>最佳成绩</span>
                </div>
                <div>
                  <strong>
                    {item.examLast}
                    <small>/{total}</small>
                  </strong>
                  <span>最近成绩</span>
                </div>
                <div>
                  <strong>{item.examPassed}</strong>
                  <span>通过次数</span>
                </div>
              </div>
              {item.practiceAnswered > 0 ? (
                <div className="stat-bar" aria-label={`练习正确率 ${accuracy}%`}>
                  <span style={{ width: `${percent(item.practiceCorrect, item.practiceAnswered)}%` }} />
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="row between wrap gap">
        <p className="muted small">清空后无法恢复，请谨慎操作。</p>
        <button type="button" className="btn btn-danger" onClick={reset}>
          清空本地数据
        </button>
      </div>
    </div>
  );
}
