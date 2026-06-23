'use client';

import type { QuestionPublic } from '@/lib/types';

interface QuestionCardProps {
  question: QuestionPublic;
  selectedAnswers: string[];
  onChange: (answers: string[]) => void;
  disabled?: boolean;
  hint: string; // "Выберите один вариант" / "Выберите все подходящие"
  sectionLabel: string; // "Раздел"
}

export function QuestionCard({
  question,
  selectedAnswers,
  onChange,
  disabled = false,
  hint,
  sectionLabel,
}: QuestionCardProps) {
  const isMultiple = question.questionType === 'multiple';

  const toggle = (option: string) => {
    if (disabled) return;

    if (isMultiple) {
      if (selectedAnswers.includes(option)) {
        onChange(selectedAnswers.filter((a) => a !== option));
      } else {
        onChange([...selectedAnswers, option]);
      }
    } else {
      onChange([option]);
    }
  };

  return (
    <div className="animate-slide-up">
      {/* Section badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block text-xs font-medium text-indigo-600 bg-indigo-50 rounded-full px-2.5 py-0.5">
          {sectionLabel} {question.group}
        </span>
        <span className="text-xs text-slate-400">
          {isMultiple ? '☑' : '○'} {hint}
        </span>
      </div>

      {/* Question text */}
      <p className="text-base sm:text-lg font-medium text-slate-900 leading-relaxed mb-5">
        {question.question}
      </p>

      {/* Options */}
      <div className="flex flex-col gap-2.5">
        {question.options.map((option, idx) => {
          const isSelected = selectedAnswers.includes(option);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(option)}
              disabled={disabled}
              aria-pressed={isSelected}
              className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-150
                flex items-start gap-3 group
                ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:border-indigo-300 active:scale-[0.99]'}
                ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }
              `}
            >
              {/* Radio / Checkbox indicator */}
              <span
                className={`mt-0.5 flex-shrink-0 w-5 h-5 flex items-center justify-center
                  border-2 transition-colors
                  ${isMultiple ? 'rounded-md' : 'rounded-full'}
                  ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-slate-300 bg-white group-hover:border-indigo-400'
                  }
                `}
              >
                {isSelected && (
                  isMultiple ? (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-white block" />
                  )
                )}
              </span>

              {/* Option text */}
              <span
                className={`text-sm sm:text-base leading-relaxed transition-colors
                  ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-700'}
                `}
              >
                {option}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
