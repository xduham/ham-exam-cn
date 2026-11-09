/* SPDX-License-Identifier: MPL-2.0 */

import { useEffect, useMemo, useState } from "react";
import { loadBank } from "../data";
import type { Bank, Question } from "../types";

export type BankStatus = "loading" | "error" | "ready";

export type BankResource = {
  bank: Bank;
  status: BankStatus;
  questions: Question[];
  error: string | null;
  byKey: Map<string, Question>;
};

const NO_QUESTIONS: Question[] = [];

type ResourceState = {
  bank: Bank;
  status: BankStatus;
  questions: Question[];
  error: string | null;
};

/**
 * Async resource state machine: loading -> ready | error, scoped to one bank.
 * loadBank caches successful promises per bank, so remounting is cheap.
 */
export function useBank(requested: Bank): BankResource {
  const [resource, setResource] = useState<ResourceState>(() => ({
    bank: requested,
    status: "loading",
    questions: NO_QUESTIONS,
    error: null,
  }));

  useEffect(() => {
    let cancelled = false;
    setResource({ bank: requested, status: "loading", questions: NO_QUESTIONS, error: null });

    loadBank(requested)
      .then((questions) => {
        if (cancelled) return;
        setResource({ bank: requested, status: "ready", questions, error: null });
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setResource({
          bank: requested,
          status: "error",
          questions: NO_QUESTIONS,
          error: reason instanceof Error ? reason.message : String(reason),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [requested]);

  // A prop change renders once with the previous resource; report loading
  // until the effect has switched to the requested bank.
  const current: ResourceState =
    resource.bank === requested
      ? resource
      : { bank: requested, status: "loading", questions: NO_QUESTIONS, error: null };

  const byKey = useMemo(
    () => new Map(current.questions.map((question) => [question.key, question])),
    [current.questions],
  );

  return { ...current, byKey };
}
