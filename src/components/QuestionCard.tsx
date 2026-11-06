/* SPDX-License-Identifier: MPL-2.0 */

import { imageUrl, orderedOptions, questionLabel } from "../data";
import type { Question } from "../types";
import { classNames } from "../utils";

type Props = {
  question: Question;
  selected: string[];
  revealed: boolean;
  onSelect: (optionKey: string) => void;
  optionSeed?: number;
  index?: number;
  total?: number;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  readOnly?: boolean;
};

export function QuestionCard({
  question,
  selected,
  revealed,
  onSelect,
  optionSeed,
  index,
  total,
  favorite = false,
  onToggleFavorite,
  readOnly = false,
}: Props) {
  const image = imageUrl(question);
  const label = questionLabel(question);
  const options =
    typeof optionSeed === "number" ? orderedOptions(question, optionSeed) : question.options;

  return (
    <article className="card question-card">
      <div className="question-head">
        <div className="question-meta">
          <span className="badge">{label}</span>
          <span className="badge badge-muted">{question.type === "single" ? "单选" : "多选"}</span>
          {typeof index === "number" && typeof total === "number" ? (
            <span className="muted small">
              第 {index + 1} / {total} 题
            </span>
          ) : null}
        </div>
        {onToggleFavorite ? (
          <button
            type="button"
            className={classNames("btn btn-icon", favorite && "favorite-on")}
            onClick={onToggleFavorite}
            aria-label={favorite ? "取消收藏" : "收藏题目"}
            title={favorite ? "取消收藏" : "收藏题目"}
          >
            {favorite ? "★" : "☆"}
          </button>
        ) : null}
      </div>

      <div className="question-text">{question.question}</div>

      {image ? (
        <img
          className="question-image"
          src={image}
          alt={`第 ${label} 题图片`}
          loading="lazy"
          decoding="async"
        />
      ) : null}

      <div className="options" role="group" aria-label="选项">
        {options.map((option) => {
          const isSelected = selected.includes(option.key);
          const isAnswer = revealed && question.answer_keys.includes(option.key);
          const isWrongChoice = revealed && isSelected && !question.answer_keys.includes(option.key);
          return (
            <button
              key={option.key}
              type="button"
              className={classNames(
                "option",
                isSelected && "selected",
                isAnswer && "correct",
                isWrongChoice && "wrong",
              )}
              aria-pressed={isSelected}
              disabled={readOnly || revealed}
              onClick={() => onSelect(option.key)}
            >
              <span className="option-key">{option.key}</span>
              <span className="option-text">{option.text}</span>
              {isAnswer ? <span className="option-mark">✓</span> : null}
              {isWrongChoice ? <span className="option-mark">✕</span> : null}
            </button>
          );
        })}
      </div>

      {revealed ? (
        <p className="answer-line">
          正确答案：<strong>{question.answer_keys.join("、")}</strong>
        </p>
      ) : null}
    </article>
  );
}
