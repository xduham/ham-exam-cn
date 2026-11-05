/* SPDX-License-Identifier: MPL-2.0 */

import { BANK_META } from "../rules";
import type { Bank } from "../types";
import { classNames } from "../utils";

const BANKS: Bank[] = ["A", "B", "C"];

type Props = {
  value: Bank;
  onChange: (bank: Bank) => void;
  disabled?: boolean;
};

export function BankPicker({ value, onChange, disabled = false }: Props) {
  return (
    <div className="bank-picker" role="radiogroup" aria-label="选择题库">
      {BANKS.map((bank) => {
        const meta = BANK_META[bank];
        const active = value === bank;
        return (
          <button
            key={bank}
            type="button"
            role="radio"
            aria-checked={active}
            className={classNames("bank-option", active && "active")}
            disabled={disabled}
            onClick={() => onChange(bank)}
          >
            <span className="bank-label">{meta.label}</span>
            <span className="bank-hint">{meta.hint}</span>
            <span className="bank-rule">{meta.rule}</span>
          </button>
        );
      })}
    </div>
  );
}
