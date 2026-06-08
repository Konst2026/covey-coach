"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Message, loadMessages, saveMessages, clearMessages } from "@/lib/storage";
import { Skill, REFLECTION_QUESTIONS } from "@/lib/covey-data";
import QuickButtons from "./QuickButtons";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: Event & { error?: string }) => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface ChatWindowProps {
  skill: Skill;
}

export default function ChatWindow({ skill }: ChatWindowProps) {
  // messages = ONLY completed messages. Never contains placeholders or streaming content.
  const [messages, setMessages] = useState<Message[]>([]);
  // streamingText: null=idle, ""=show dots, "text"=streaming in progress
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [reflectionStep, setReflectionStep] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true); // ON by default

  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef("");

  // Always-fresh refs — eliminate stale closure bugs entirely
  const messagesRef = useRef<Message[]>([]);
  const isStreamingRef = useRef(false);
  const ttsEnabledRef = useRef(true);
  const sendMessageRef = useRef<(text: string) => void>(() => {});
  const reflectionStepRef = useRef<number | null>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => { ttsEnabledRef.current = ttsEnabled; }, [ttsEnabled]);
  useEffect(() => { reflectionStepRef.current = reflectionStep; }, [reflectionStep]);

  useEffect(() => {
    setVoiceSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  // Load from localStorage once on mount
  useEffect(() => {
    const saved = loadMessages();
    if (saved.length > 0) {
      setMessages(saved);
    } else {
      setMessages([{
        role: "assistant",
        content: `Добро пожаловать! Сегодня работаем с Навыком ${skill.number} — **${skill.name}**.\n\nКакой вопрос у вас есть по этому навыку, или начнём с задания дня?`,
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const speakText = useCallback((text: string) => {
    if (!ttsEnabledRef.current) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const clean = text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/[*_#]/g, "").trim();
    if (!clean) return;

    const perform = () => {
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "ru-RU";
      utterance.rate = 0.9;
      const voices = synth.getVoices();
      const ruVoice = voices.find((v) => v.lang.startsWith("ru"));
      if (ruVoice) utterance.voice = ruVoice;
      // resume() wakes up audio context on Chrome Android, then speak
      synth.resume();
      synth.speak(utterance);
    };

    // Voices may not be loaded on the first call
    if (synth.getVoices().length > 0) {
      setTimeout(perform, 100); // short delay after cancel() prevents Chrome silent-fail
    } else {
      synth.addEventListener("voiceschanged", () => setTimeout(perform, 100), { once: true });
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreamingRef.current) return;

    // Set ref immediately — prevents any concurrent call before first await
    isStreamingRef.current = true;

    const userMsg: Message = { role: "user", content: text };
    // Capture message history once — this local variable never changes during the call
    const newMessages = [...messagesRef.current, userMsg];

    setMessages(newMessages);   // messages = [...history, user]. No placeholder here.
    setStreamingText("");        // empty string = show dots
    setInput("");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          skillName: skill.name,
          skillDescription: skill.description,
        }),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamingText(full); // direct set, no array mutation, no functional updater needed
      }

      // Streaming done — commit final AI message into messages array
      const finalMessages: Message[] = [...newMessages, { role: "assistant", content: full }];
      setMessages(finalMessages);
      setStreamingText(null);
      saveMessages(finalMessages);
      speakText(full);

      const step = reflectionStepRef.current;
      if (step !== null) {
        const nextStep = step + 1;
        if (nextStep < REFLECTION_QUESTIONS.length) {
          setReflectionStep(nextStep);
          setTimeout(() => sendMessageRef.current(REFLECTION_QUESTIONS[nextStep]), 400);
        } else {
          setReflectionStep(null);
        }
      }
    } catch (err) {
      console.error(err);
      setStreamingText(null);
      // Append error to completed messages (prev = newMessages since that's the last setMessages call)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Произошла ошибка. Проверьте соединение и попробуйте снова." },
      ]);
    } finally {
      setIsStreaming(false);
      isStreamingRef.current = false;
    }
  }, [skill, speakText]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  const handleQuickButton = useCallback(
    (prompt: string) => {
      if (prompt === "__reflection__") {
        setReflectionStep(0);
        sendMessage(REFLECTION_QUESTIONS[0]);
      } else {
        sendMessage(prompt);
      }
    },
    [sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = () => {
    window.speechSynthesis?.cancel();
    clearMessages();
    setStreamingText(null);
    setMessages([{
      role: "assistant",
      content: `История очищена. Продолжаем с Навыком ${skill.number} — **${skill.name}**. Чем могу помочь?`,
    }]);
    setReflectionStep(null);
  };

  const toggleTts = () => {
    const next = !ttsEnabled;
    if (!next) {
      window.speechSynthesis?.cancel();
    } else if (window.speechSynthesis) {
      // Speak a silent utterance to unlock the audio context on this user gesture
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    setTtsEnabled(next);
  };

  const toggleVoice = useCallback(() => {
    setVoiceError("");

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Голосовой ввод не поддерживается в этом браузере.");
      return;
    }

    transcriptRef.current = "";
    const recognition = new SR();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      if (finalText) {
        const next = (transcriptRef.current ? transcriptRef.current + " " + finalText : finalText).trim();
        transcriptRef.current = next;
        setInput(next);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      const text = transcriptRef.current.trim();
      if (text) {
        if (!isStreamingRef.current) {
          transcriptRef.current = "";
          setInput("");
          sendMessageRef.current(text);
        }
        // if currently streaming, text stays in input field — user can send manually
      }
    };

    recognition.onerror = (e: Event & { error?: string }) => {
      setIsListening(false);
      const code = e.error ?? "";
      if (code === "not-allowed") {
        setVoiceError("Нет доступа к микрофону. Разрешите в настройках браузера.");
      } else if (code === "no-speech") {
        setVoiceError("Речь не обнаружена. Попробуйте ещё раз.");
        setTimeout(() => setVoiceError(""), 3000);
      } else {
        setVoiceError("Ошибка записи. Попробуйте ещё раз.");
        setTimeout(() => setVoiceError(""), 3000);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setVoiceError("Не удалось запустить запись. Перезагрузите страницу.");
    }
  }, [isListening]);

  return (
    <div className="flex flex-col h-full bg-white/40 rounded-2xl border border-[#D6C6A5] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#D6C6A5] bg-[#EFE8D8]/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#6D8A63] animate-pulse" />
          <span className="text-sm font-medium text-[#1A1814]">Наставник Кови</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTts}
            title={ttsEnabled ? "Выключить голос AI" : "Включить голос AI"}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
              ttsEnabled
                ? "bg-[#A38B4F] text-white"
                : "text-[#6B6355] hover:text-[#A38B4F]"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {ttsEnabled ? (
                <>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </>
              ) : (
                <line x1="23" y1="9" x2="17" y2="15" />
              )}
            </svg>
            <span>{ttsEnabled ? "Голос AI: вкл" : "Голос AI: выкл"}</span>
          </button>
          <button onClick={handleClear} className="text-xs text-[#6B6355] hover:text-[#A38B4F] transition-colors">
            Очистить
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#A38B4F] text-white rounded-br-sm"
                  : "bg-[#EFE8D8] text-[#1A1814] rounded-bl-sm"
              }`}
              dangerouslySetInnerHTML={{
                __html: msg.content
                  .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                  .replace(/\n/g, "<br/>"),
              }}
            />
          </div>
        ))}

        {/* Streaming bubble — completely separate from messages array, so duplication is impossible */}
        {streamingText !== null && (
          <div className="flex justify-start">
            <div className="bg-[#EFE8D8] text-[#1A1814] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed max-w-[80%]">
              {streamingText === "" ? (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A38B4F] animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A38B4F] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A38B4F] animate-bounce [animation-delay:300ms]" />
                </span>
              ) : (
                <span
                  dangerouslySetInnerHTML={{
                    __html: streamingText
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick buttons */}
      <div className="px-4 py-2 border-t border-[#D6C6A5]/50">
        <QuickButtons onSelect={handleQuickButton} disabled={isStreaming} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#D6C6A5] bg-[#EFE8D8]/40">
        <div className="flex gap-2 items-end">
          {voiceSupported && (
            <button
              onClick={toggleVoice}
              disabled={isStreaming}
              title={isListening ? "Остановить и отправить" : "Говорить голосом"}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${
                isListening
                  ? "bg-red-500 text-white scale-105 animate-pulse"
                  : "bg-[#A38B4F] text-white hover:bg-[#8B7340]"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </button>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={1}
            placeholder={isListening ? "Слушаю… нажмите микрофон чтобы отправить" : "Напишите или нажмите микрофон…"}
            className="flex-1 resize-none rounded-xl border border-[#D6C6A5] bg-white/80 px-4 py-2.5 text-sm text-[#1A1814] placeholder:text-[#6B6355]/60 focus:outline-none focus:ring-2 focus:ring-[#A38B4F]/30 disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#A38B4F] text-white hover:bg-[#8B7340] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        {isListening && (
          <p className="text-xs text-red-500 mt-2 text-center font-medium animate-pulse">
            🎙 Говорите… нажмите микрофон ещё раз чтобы отправить
          </p>
        )}
        {voiceError && (
          <p className="text-xs text-red-500 mt-2 text-center">{voiceError}</p>
        )}
      </div>
    </div>
  );
}
