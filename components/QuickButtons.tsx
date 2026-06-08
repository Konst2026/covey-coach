"use client";

interface QuickButtonsProps {
  onSelect: (text: string) => void;
  disabled: boolean;
}

const BUTTONS = [
  { label: "Объясни этот навык", prompt: "Объясни мне подробнее сегодняшний навык и почему он важен." },
  { label: "Дай задание", prompt: "Дай мне конкретное практическое упражнение для отработки навыка прямо сейчас." },
  { label: "Начать рефлексию", prompt: "__reflection__" },
];

export default function QuickButtons({ onSelect, disabled }: QuickButtonsProps) {
  return (
    <div className="flex gap-2 flex-wrap px-1">
      {BUTTONS.map((btn) => (
        <button
          key={btn.label}
          onClick={() => onSelect(btn.prompt)}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-full border border-[#D6C6A5] bg-[#EFE8D8] text-[#6B6355] hover:bg-[#D6C6A5] hover:text-[#1A1814] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
