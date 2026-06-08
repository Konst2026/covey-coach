"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Capture the event at module load time — it can fire before React mounts
let savedPrompt: BeforeInstallPromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    savedPrompt = e as BeforeInstallPromptEvent;
  });
}

export default function InstallBanner() {
  const [mode, setMode] = useState<"android" | "ios" | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem("pwa_install_dismissed")) return;

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (isIOS) {
      const isSafari = /Safari/.test(ua) && !/CriOS/.test(ua) && !/Chrome/.test(ua);
      if (isSafari) setMode("ios");
      return;
    }

    if (!isAndroid) return;

    // Check if the event already arrived before we mounted
    if (savedPrompt) {
      setDeferredPrompt(savedPrompt);
      setMode("android");
      return;
    }

    // Still waiting — poll briefly (service worker may still be installing)
    const timer = setInterval(() => {
      if (savedPrompt) {
        setDeferredPrompt(savedPrompt);
        setMode("android");
        clearInterval(timer);
      }
    }, 500);
    // Stop polling after 30 seconds
    setTimeout(() => clearInterval(timer), 30000);

    return () => clearInterval(timer);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
  };

  const dismiss = () => {
    localStorage.setItem("pwa_install_dismissed", "1");
    setDismissed(true);
  };

  if (dismissed || !mode) return null;

  return (
    <div className="bg-[#1A1814] text-white px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#A38B4F] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">7</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">Установить Коуч Кови</p>
          {mode === "android" && (
            <p className="text-xs text-white/60 mt-0.5">Откройте как приложение — без браузера</p>
          )}
          {mode === "ios" && (
            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
              Нажмите{" "}
              <span className="inline-block bg-white/20 px-1.5 py-0.5 rounded text-white text-[11px]">
                Поделиться ↑
              </span>{" "}
              → «На экран Домой»
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
        {mode === "android" && (
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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
