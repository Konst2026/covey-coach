"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Message, loadMessages, saveMessages, clearMessages } from "@/lib/storage";
import { Skill, REFLECTION_QUESTIONS } from "@/lib/covey-data";
import QuickButtons from "./QuickButtons";

interface ChatWindowProps {
  skill: Skill;
}

export default function ChatWindow({ skill }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [reflectionStep, setReflectionStep] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = loadMessages();
    if (saved.length > 0) {
      setMessages(saved);
    } else {
      const welcome: Message = {
        role: "assistant",
        content: `Добро пожаловать! Сегодня работаем с Навыком ${skill.number} — **${skill.name}**.\n\nКакой вопрос у вас есть по этому навыку, или начнём с задания дня?`,
      };
      setMessages([welcome]);
    }
  }, [skill]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = { role: "user", content: text };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setIsStreaming(true);

      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistantMsg]);

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
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: full };
            return updated;
          });
        }

        const finalMessages: Message[] = [...newMessages, { role: "assistant", content: full }];
        saveMessages(finalMessages);

        // advance reflection
        if (reflectionStep !== null) {
          const nextStep = reflectionStep + 1;
          if (nextStep < REFLECTION_QUESTIONS.length) {
            setReflectionStep(nextStep);
            setTimeout(() => sendMessage(REFLECTION_QUESTIONS[nextStep]), 400);
          } else {
            setReflectionStep(null);
          }
        }
      } catch (err) {
        console.error(err);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: "Произошла ошибка. Проверьте API-ключ и попробуйте снова.",
          };
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming, skill, reflectionStep]
  );

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
    clearMessages();
    setMessages([
      {
        role: "assistant",
        content: `История очищена. Продолжаем с Навыком ${skill.number} — **${skill.name}**. Чем могу помочь?`,
      },
    ]);
    setReflectionStep(null);
  };

  return (
    <div className="flex flex-col h-full bg-white/40 rounded-2xl border border-[#D6C6A5] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#D6C6A5] bg-[#EFE8D8]/60">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#6D8A63] animate-pulse" />
          <span className="text-sm font-medium text-[#1A1814]">Наставник Кови</span>
        </div>
        <button
          onClick={handleClear}
          className="text-xs text-[#6B6355] hover:text-[#A38B4F] transition-colors"
        >
          Очистить
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
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
        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex justify-start">
            <div className="bg-[#EFE8D8] rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="inline-flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A38B4F] animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A38B4F] animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#A38B4F] animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick buttons */}
      <div className="px-5 py-2 border-t border-[#D6C6A5]/50">
        <QuickButtons onSelect={handleQuickButton} disabled={isStreaming} />
      </div>

      {/* Input */}
      <div className="px-5 py-3 border-t border-[#D6C6A5] bg-[#EFE8D8]/40">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            rows={1}
            placeholder="Напишите сообщение… (Enter — отправить)"
            className="flex-1 resize-none rounded-xl border border-[#D6C6A5] bg-white/80 px-4 py-2.5 text-sm text-[#1A1814] placeholder:text-[#6B6355]/60 focus:outline-none focus:ring-2 focus:ring-[#A38B4F]/30 disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isStreaming || !input.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#A38B4F] text-white hover:bg-[#8B7340] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
