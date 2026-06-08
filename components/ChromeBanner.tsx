"use client";

import { useEffect, useState } from "react";

function isChrome(): boolean {
  const ua = navigator.userAgent;
  // Chrome on iOS uses CriOS, Chrome on Android/Desktop uses Chrome
  const isChromeBrowser =
    /CriOS\//.test(ua) || (/Chrome\//.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua));
  return isChromeBrowser;
}

function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
}

function getChromeUrl(): string {
  const currentUrl = window.location.href;
  const ua = navigator.userAgent;

  if (/iPhone|iPad|iPod/.test(ua)) {
    // iOS: googlechrome:// scheme
    return currentUrl.replace(/^https?:\/\//, "googlechrome://");
  }

  // Android: intent scheme
  const host = window.location.host;
  const path = window.location.pathname + window.location.search;
  return `intent://${host}${path}#Intent;scheme=https;package=com.android.chrome;end`;
}

export default function ChromeBanner() {
  const [show, setShow] = useState(false);
  const [chromeUrl, setChromeUrl] = useState("");

  useEffect(() => {
    if (isMobile() && !isChrome()) {
      setShow(true);
      setChromeUrl(getChromeUrl());
    }
  }, []);

  if (!show) return null;

  return (
    <div className="bg-[#1A1814] text-white px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-[#A38B4F]">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-xs leading-snug">
          Для голосового ввода нужен <strong>Chrome</strong>
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={chromeUrl}
          className="text-xs bg-[#A38B4F] hover:bg-[#8B7340] text-white px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
        >
          Открыть в Chrome
        </a>
        <button
          onClick={() => setShow(false)}
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
