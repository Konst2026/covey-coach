"use client";

import { getTodaySkill } from "@/lib/covey-data";
import SkillCard from "@/components/SkillCard";
import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  const skill = getTodaySkill();

  return (
    <div className="min-h-screen bg-[#F8F5EE] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#D6C6A5] bg-[#F8F5EE]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#A38B4F] flex items-center justify-center">
              <span className="text-white text-sm font-bold">7</span>
            </div>
            <span className="font-semibold text-[#1A1814] tracking-tight">Коуч Кови</span>
          </div>
          <span className="text-xs text-[#6B6355]">Навык {skill.number} из 7</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
        {/* Left — Skill info */}
        <div className="flex flex-col gap-4">
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

        {/* Right — Chat */}
        <div className="flex flex-col" style={{ minHeight: "calc(100vh - 140px)" }}>
          <ChatWindow skill={skill} />
        </div>
      </main>
    </div>
  );
}
