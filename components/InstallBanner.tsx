"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Capture the native install prompt as early as possible (before React mounts)
let savedPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    savedPrompt = e as BeforeInstallPromptEvent;
  });
}

export default function InstallBanner() {
  const [platform, setPlatform] = useState<"android" | "ios" | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem("pwa_banner_v3")) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (isIOS) {
      // Only show in Safari (not in Chrome for iOS, which can't install)
      const isSafari = /Safari/.test(ua) && !/CriOS/.test(ua) && !/Chrome/.test(ua);
      if (isSafari) setPlatform("ios");
      return;
    }

    if (isAndroid) {
      setPlatform("android"); // Show immediately with manual instructions
      if (savedPrompt) {
        setDeferredPrompt(savedPrompt); // Native prompt already captured
      } else {
        // Poll briefly — the prompt may arrive after SW installs
        const timer = setInterval(() => {
          if (savedPrompt) {
            setDeferredPrompt(savedPrompt);
            clearInterval(timer);
          }
        }, 500);
        setTimeout(() => clearInterval(timer), 20000);
        return () => clearInterval(timer);
      }
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
  };

  const dismiss = () => {
    localStorage.setItem("pwa_banner_v3", "1");
    setDismissed(true);
  };

  if (dismissed || !platform) return null;

  return (
    <div className="bg-[#1A1814] text-white px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#A38B4F] flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white font-bold text-lg">7</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Установить Коуч Кови на телефон</p>

          {platform === "android" && deferredPrompt && (
            <p className="text-xs text-white/60 mt-0.5">Нажмите кнопку чтобы добавить на главный экран</p>
          )}
          {platform === "android" && !deferredPrompt && (
            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
              Нажмите <span className="bg-white/20 px-1 rounded">⋮</span> в браузере → <strong className="text-white/80">«Добавить на главный экран»</strong>
            </p>
          )}
          {platform === "ios" && (
            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
              Нажмите <span className="bg-white/20 px-1.5 py-0.5 rounded">Поделиться ↑</span> → <strong className="text-white/80">«На экран Домой»</strong>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
        {platform === "android" && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="text-xs bg-[#A38B4F] hover:bg-[#8B7340] text-white px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            Установить
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-white/40 hover:text-white transition-colors"
          aria-label="Закрыть"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
