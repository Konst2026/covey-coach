"use client";

import { getTodaySkill } from "@/lib/covey-data";
import SkillCard from "@/components/SkillCard";
import ChatWindow from "@/components/ChatWindow";
import ChromeBanner from "@/components/ChromeBanner";

export default function Home() {
  const skill = getTodaySkill();

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex flex-col">
      <ChromeBanner />
      {/* Header */}
      <header className="border-b border-[#D6C6A5] bg-[#F8F5EE]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#A38B4F] flex items-center justify-center">
              <span className="text-white text-xs font-bold">7</span>
            </div>
            <span className="font-semibold text-[#1A1814] tracking-tight text-sm">Коуч Кови</span>
          </div>
          <span className="text-xs text-[#6B6355]">Навык {skill.number} / 7</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-3 py-3 lg:px-6 lg:py-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-3 lg:gap-6">

        {/* Left — Skill info (hidden on mobile, visible on desktop) */}
        <div className="hidden lg:flex flex-col gap-4">
          <SkillCard skill={skill} />

          {/* Week navigation */}
          <div className="bg-[#EFE8D8]/60 rounded-xl p-4 border border-[#D6C6A5]">
            <p className="text-xs font-medium text-[#6B6355] mb-3 uppercase tracking-wide">
              Все 7 навыков
            </p>
            <div className="grid grid-cols-7 gap-1">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d, i) => {
                const dayIndex = new Date().getDay();
                const todayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
                const isToday = i === todayIndex;
                return (
                  <div
                    key={d}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-lg ${
                      isToday ? "bg-[#A38B4F]" : "bg-white/40"
                    }`}
                  >
                    <span className={`text-[10px] font-medium ${isToday ? "text-white" : "text-[#6B6355]"}`}>
                      {d}
                    </span>
                    <span className={`text-xs font-bold ${isToday ? "text-white" : "text-[#A38B4F]"}`}>
                      {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile — compact skill banner */}
        <div className="lg:hidden bg-[#EFE8D8] rounded-xl p-4 border border-[#D6C6A5]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-[#A38B4F]">{skill.number}</span>
                <span className="text-sm font-semibold text-[#1A1814] truncate">{skill.name}</span>
              </div>
              <p className="text-xs text-[#6B6355] italic leading-relaxed line-clamp-2">
                «{skill.quote}»
              </p>
            </div>
          </div>
          <div className="mt-3 bg-white/60 rounded-lg p-3">
            <p className="text-xs font-medium text-[#A38B4F] mb-1 uppercase tracking-wide">Задание</p>
            <p className="text-xs text-[#1A1814] leading-relaxed">{skill.task}</p>
          </div>
        </div>

        {/* Chat — full height */}
        <div
          className="flex flex-col"
          style={{ height: "calc(100dvh - 180px)", minHeight: "400px" }}
        >
          <ChatWindow skill={skill} />
        </div>
      </main>
    </div>
  );
}
