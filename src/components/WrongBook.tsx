/* SPDX-License-Identifier: MPL-2.0 */

import { useCollections } from "../hooks/useCollections";
import { BANK_META } from "../rules";
import type { Bank } from "../types";
import { formatDate } from "../utils";

type Props = {
  bank: Bank;
  onPractice: () => void;
  onExit: () => void;
};

export function WrongBook({ bank, onPractice, onExit }: Props) {
  const { wrongEntries, removeWrong } = useCollections(bank);

  return (
    <div className="view">
      <div className="view-head">
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          ← 返回
        </button>
        <div className="view-title-wrap">
          <h1 className="view-title">错题本</h1>
          <p className="muted small">
            {BANK_META[bank].label} · 共 {wrongEntries.length} 题
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPractice}
          disabled={wrongEntries.length === 0}
        >
          开始练习
        </button>
      </div>

      <p className="muted small">
        练习或考试答错的题会自动收录。在错题练习中答对一次即自动移出，也可以手动移除。
      </p>

      {wrongEntries.length === 0 ? (
        <div className="card empty">
          <p>当前题库还没有错题。</p>
          <button type="button" className="btn btn-primary" onClick={onExit}>
            去做练习
          </button>
        </div>
      ) : (
        <div className="list">
          {wrongEntries.map((entry) => (
            <div className="card list-row" key={entry.key}>
              <div className="list-main">
                <div className="row gap">
                  <span className="badge">{entry.number ?? entry.key}</span>
                  <span className="muted small">错 {entry.wrongCount} 次</span>
                  <span className="muted small">{formatDate(entry.lastWrongAt)}</span>
                </div>
                <p className="list-title">{entry.snippet}</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => removeWrong(entry.key)}
              >
                移除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
