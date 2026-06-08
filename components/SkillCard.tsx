"use client";

import { Skill } from "@/lib/covey-data";

const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

interface SkillCardProps {
  skill: Skill;
}

export default function SkillCard({ skill }: SkillCardProps) {
  const today = new Date();
  const dayName = DAY_NAMES[today.getDay()];
  const dateStr = today.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
  });

  return (
    <div className="bg-[#EFE8D8] rounded-2xl p-6 border border-[#D6C6A5]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-[#6B6355] uppercase tracking-widest">
          Навык дня
        </span>
        <span className="text-xs text-[#6B6355] bg-[#D6C6A5] px-3 py-1 rounded-full">
          {dayName}, {dateStr}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-3xl font-bold text-[#A38B4F]">
            {skill.number}
          </span>
          <h2 className="text-xl font-semibold text-[#1A1814]">{skill.name}</h2>
        </div>
        <p className="text-sm text-[#6B6355]">{skill.description}</p>
      </div>

      <blockquote className="border-l-2 border-[#A38B4F] pl-4 mb-5">
        <p className="text-[#1A1814] italic text-sm leading-relaxed">
          «{skill.quote}»
        </p>
        <footer className="text-xs text-[#6B6355] mt-1">— Стивен Кови</footer>
      </blockquote>

      <div className="bg-white/60 rounded-xl p-4">
        <p className="text-xs font-medium text-[#A38B4F] uppercase tracking-wide mb-2">
          Задание дня
        </p>
        <p className="text-sm text-[#1A1814] leading-relaxed">{skill.task}</p>
      </div>
    </div>
  );
}
