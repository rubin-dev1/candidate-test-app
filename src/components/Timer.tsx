'use client';

import { useEffect, useRef, useState } from 'react';

interface TimerProps {
  duration: number; // seconds
  onExpire: () => void;
  label: string;
}

export function Timer({ duration, onExpire, label }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const onExpireRef = useRef(onExpire);

  // Обновляем ref без пересоздания интервала
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  // Сбрасываем таймер при смене duration (смена вопроса через key-prop родителя)
  useEffect(() => {
    setTimeLeft(duration);

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Используем setTimeout чтобы не вызывать setState родителя во время рендера
          setTimeout(() => onExpireRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration]);

  const pct = (timeLeft / duration) * 100;
  const isWarning = timeLeft <= 10;
  const isDanger = timeLeft <= 5;

  const timeColor = isDanger
    ? 'text-red-600'
    : isWarning
    ? 'text-amber-600'
    : 'text-slate-700';

  const barColor = isDanger
    ? 'bg-red-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-indigo-500';

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className={`text-base font-bold font-mono tabular-nums transition-colors ${timeColor}`}>
          {mm}:{ss}
        </span>
      </div>
      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
