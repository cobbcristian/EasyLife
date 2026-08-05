"use client";

import {
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * iMessage-style thread column:
 * - Short threads stick to the bottom (above the composer)
 * - Overflow scrolls normally (top → older)
 * - New messages pin the viewport to the latest bubble
 */
export function ChatThreadScroll({
  children,
  scrollKey,
  className,
}: {
  children: ReactNode;
  /** Change when messages load / send so we stick to the latest. */
  scrollKey: string | number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Prefer scrollIntoView so iOS WKWebView keeps the latest bubble visible.
    endRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    el.scrollTop = el.scrollHeight;
  }, [scrollKey]);

  return (
    <div
      ref={ref}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      {/* spacer + mt-auto: short threads sit at the bottom without breaking scroll */}
      <div className="flex min-h-full flex-col">
        <div className="mt-auto flex flex-col gap-3 px-4 py-3">
          {children}
          <div ref={endRef} aria-hidden className="h-px w-full shrink-0" />
        </div>
      </div>
    </div>
  );
}

type ChatComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
  /** Icons left of the pill (attach / photo). */
  leading?: ReactNode;
  className?: string;
  /** Extra strip above the field (e.g. booking request banner). */
  banner?: ReactNode;
};

/** iMessage-style field: pill input with blue circular up-arrow send. */
export function ChatComposer({
  value,
  onChange,
  onSend,
  placeholder = "Message",
  disabled,
  leading,
  className,
  banner,
}: ChatComposerProps) {
  const canSend = value.trim().length > 0 && !disabled;

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!canSend) return;
    await onSend();
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className={cn(
        "shrink-0 border-t border-[#e5e5ea] bg-white px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {banner}
      <div className="flex items-end gap-1.5">
        {leading ? (
          <div className="mb-1 flex shrink-0 items-center gap-0.5 text-[#8e8e93]">
            {leading}
          </div>
        ) : null}
        <div
          className={cn(
            "flex min-h-[36px] min-w-0 flex-1 items-end gap-1 rounded-[20px] border bg-[#f2f2f7] py-1 pl-3.5 pr-1",
            canSend ? "border-[#007aff]/45" : "border-[#c7c7cc]",
          )}
        >
          <input
            value={value}
            disabled={disabled}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[16px] leading-5 text-black outline-none placeholder:text-[#8e8e93] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              "mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
              canSend ? "bg-[#007aff]" : "bg-[#c7c7cc]",
            )}
          >
            <ArrowUp className="h-5 w-5 text-white" strokeWidth={3} />
          </button>
        </div>
      </div>
    </form>
  );
}
