'use client';

interface ProgressBarProps {
  current: number; // 1-based
  total: number;
  label: string; // e.g. "Вопрос"
  ofLabel: string; // e.g. "из"
}

export function ProgressBar({ current, total, label, ofLabel }: ProgressBarProps) {
  const pct = Math.round(((current - 1) / total) * 100);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-slate-700">
          {label} {current} {ofLabel} {total}
        </span>
        <span className="text-xs text-slate-400">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
