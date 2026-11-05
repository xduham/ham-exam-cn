/* SPDX-License-Identifier: MPL-2.0 */

import { useState } from "react";
import { favoriteEntries, removeFavorite } from "../collections";
import { BANK_META } from "../rules";
import type { Bank } from "../types";
import { formatDate } from "../utils";

type Props = {
  bank: Bank;
  onPractice: () => void;
  onExit: () => void;
};

export function Favorites({ bank, onPractice, onExit }: Props) {
  const [, setTick] = useState(0);
  const entries = favoriteEntries(bank);

  return (
    <div className="view">
      <div className="view-head">
        <button type="button" className="btn btn-ghost" onClick={onExit}>
          ← 返回
        </button>
        <div className="view-title-wrap">
          <h1 className="view-title">收藏</h1>
          <p className="muted small">
            {BANK_META[bank].label} · 共 {entries.length} 题
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPractice}
          disabled={entries.length === 0}
        >
          开始练习
        </button>
      </div>

      <p className="muted small">练习时点题目右上角的星标即可收藏，方便反复回看。</p>

      {entries.length === 0 ? (
        <div className="card empty">
          <p>当前题库还没有收藏题目。</p>
          <button type="button" className="btn btn-primary" onClick={onExit}>
            去做练习
          </button>
        </div>
      ) : (
        <div className="list">
          {entries.map((entry) => (
            <div className="card list-row" key={entry.key}>
              <div className="list-main">
                <div className="row gap">
                  <span className="badge">{entry.number ?? entry.key}</span>
                  <span className="muted small">{formatDate(entry.createdAt)}</span>
                </div>
                <p className="list-title">{entry.snippet}</p>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  removeFavorite(bank, entry.key);
                  setTick((value) => value + 1);
                }}
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
