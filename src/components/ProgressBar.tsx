/* SPDX-License-Identifier: MPL-2.0 */

type Props = {
  value: number;
};

export function ProgressBar({ value }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
    >
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
}
