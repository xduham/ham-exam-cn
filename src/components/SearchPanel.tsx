/* SPDX-License-Identifier: MPL-2.0 */

import { useEffect, useMemo, useRef, useState } from "react";
import { questionLabel, questionSnippet } from "../data";
import type { Question } from "../types";

type Props = {
  questions: Question[];
  onJump: (key: string) => void;
  onClose: () => void;
};

export function SearchPanel({ questions, onJump, onClose }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return questions
      .filter((question) => {
        const haystack = [
          question.number,
          question.code,
          question.question,
          ...question.options.map((option) => option.text),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      })
      .slice(0, 30);
  }, [query, questions]);

  const first = results[0];

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal card" role="dialog" aria-modal="true" aria-label="搜索题目">
        <div className="modal-head">
          <h2 className="section-title">搜索题目</h2>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="关闭搜索">
            ✕
          </button>
        </div>
        <input
          ref={inputRef}
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && first) {
              onJump(first.key);
            }
          }}
          placeholder="输入题号或关键词"
          aria-label="搜索题号或关键词"
        />
        <p className="muted small">搜索题干、选项和题号。按 Enter 跳到第一条结果。</p>

        <div className="search-results">
          {results.map((question) => (
            <button
              key={question.key}
              type="button"
              className="search-result"
              onClick={() => onJump(question.key)}
            >
              <span className="badge">{questionLabel(question)}</span>
              <span className="search-snippet">{questionSnippet(question, 70)}</span>
            </button>
          ))}
          {query.trim() && results.length === 0 ? (
            <p className="empty">没有找到匹配题目。</p>
          ) : null}
          {!query.trim() ? (
            <p className="empty">输入题号或关键词开始搜索。</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
