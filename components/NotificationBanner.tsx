"use client";

import { useEffect, useState } from "react";

function scheduleNextDayNotification() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  // Show a notification tomorrow at 9:00
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const delay = tomorrow.getTime() - now.getTime();

  setTimeout(() => {
    if (Notification.permission === "granted") {
      const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      const skills = [
        "Будьте проактивны",
        "Начинайте с конечной цели",
        "Сначала делайте важное",
        "Думайте Win-Win",
        "Сначала стремитесь понять",
        "Достигайте синергии",
        "Затачивайте пилу",
      ];
      const dayIdx = new Date().getDay();
      const skillIdx = dayIdx === 0 ? 6 : dayIdx - 1;

      new Notification("Коуч Кови — навык дня", {
        body: `Навык ${skillIdx + 1}: ${skills[skillIdx]}`,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: "daily-reminder",
      });

      scheduleNextDayNotification(); // schedule the next day
    }
  }, delay);
}

export default function NotificationBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return; // already enabled
    if (Notification.permission === "denied") return;  // user blocked it
    if (localStorage.getItem("notif_dismissed")) return;
    setShow(true);
  }, []);

  const handleEnable = async () => {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("Коуч Кови — уведомления включены!", {
        body: "Каждый день в 9:00 вы будете получать навык дня.",
        icon: "/icon.svg",
        tag: "welcome",
      });
      scheduleNextDayNotification();
    }
    dismiss();
  };

  const dismiss = () => {
    localStorage.setItem("notif_dismissed", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="bg-[#6D8A63] text-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <p className="text-xs leading-snug">
          Включить напоминание о навыке дня в <strong>9:00</strong>?
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleEnable}
          className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
        >
          Включить
        </button>
        <button
          onClick={dismiss}
          className="text-white/50 hover:text-white transition-colors"
          aria-label="Закрыть"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
