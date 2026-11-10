"use client";

import { useEffect, useId, useRef, useState } from "react";

import { MAX_CHARS, type ChatMessage } from "@/lib/chat";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["How do I transfer money?", "I lost my card", "Are there any fees?"];

/** Renders **bold** as <strong> without injecting HTML. */
function RichText({ text }: { text: string }) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

const ChatAgent = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [demo, setDemo] = useState(false);

  const panelId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function close() {
    abortRef.current?.abort();
    setOpen(false);
    launcherRef.current?.focus();
  }

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;

    const history: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setPending(true);
    inputRef.current?.focus(); // suggestion chips unmount after the first send; keep the keyboard in the chat

    const appendToReply = (chunk: string) =>
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        next[next.length - 1] = { ...last, content: last.content + chunk };
        return next;
      });

    abortRef.current = new AbortController();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: abortRef.current.signal,
      });
      setDemo(res.headers.get("X-Assistant-Mode") === "demo");
      if (!res.ok || !res.body) {
        appendToReply((await res.text()) || "Something went wrong. Please try again.");
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      for (let r = await reader.read(); !r.done; r = await reader.read()) appendToReply(r.value);
    } catch (error) {
      if ((error as Error).name !== "AbortError") appendToReply("I couldn't reach the assistant. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <section
        id={panelId}
        role="dialog"
        aria-label="Horizon Assistant"
        aria-hidden={!open}
        inert={!open}
        onKeyDown={(e) => e.key === "Escape" && close()}
        className={cn(
          "flex h-[min(600px,calc(100dvh-7rem))] w-[min(400px,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "scale-100 opacity-100" : "pointer-events-none scale-50 opacity-0"
        )}
      >
        <header className="flex items-center gap-3 bg-bank-gradient px-4 py-3 text-white">
          <span aria-hidden className="flex size-9 items-center justify-center rounded-full bg-white/20 text-lg">✦</span>
          <div className="flex-1">
            <h2 className="text-16 font-semibold">Horizon Assistant</h2>
            <p className="text-12 text-white/80">{demo ? "Demo mode · sample answers" : "Typically replies instantly"}</p>
          </div>
          <button type="button" onClick={close} aria-label="Close chat" className="rounded-full p-2 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto bg-gray-25 p-4" aria-live="polite" aria-busy={pending}>
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-14 text-gray-600">Hi! Ask me about your balance, transfers, cards, or fees.</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-blue-100 bg-white px-3 py-1.5 text-14 text-blue-700 hover:bg-blue-25">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <p
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-14",
                m.role === "user" ? "ml-auto rounded-br-sm bg-bankGradient text-white" : "rounded-bl-sm border border-gray-200 bg-white text-gray-900"
              )}
            >
              {m.content ? <RichText text={m.content} /> : <span className="animate-pulse text-gray-500">Typing…</span>}
            </p>
          ))}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 border-t border-gray-200 p-3"
        >
          <label htmlFor={`${panelId}-input`} className="sr-only">Your question</label>
          <textarea
            id={`${panelId}-input`}
            ref={inputRef}
            rows={1}
            value={input}
            maxLength={MAX_CHARS}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Type your question…"
            className="max-h-32 flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-14 text-gray-900 placeholder:text-gray-500 focus:border-bankGradient focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            aria-label="Send"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bankGradient text-white transition-opacity disabled:opacity-40"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        </form>
        <p className="px-3 pb-2 text-center text-10 text-gray-500">Never share passwords, PINs, or full card numbers in chat.</p>
      </section>

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close chat" : "Chat with Horizon Assistant"}
        className="flex size-14 items-center justify-center rounded-full bg-bank-gradient text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bankGradient motion-reduce:transition-none"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {open ? <path d="M6 9l6 6 6-6" /> : <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />}
        </svg>
      </button>
    </div>
  );
};

export default ChatAgent;
