"use client";

import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";

type ChatMarkdownProps = {
  className?: string;
  children: string;
  invert?: boolean;
  isAnimating?: boolean;
};

export function ChatMarkdown({
  className,
  children,
  invert = false,
  isAnimating = false,
}: ChatMarkdownProps) {
  return (
    <Streamdown
      className={cn(
        "chat-markdown whitespace-pre-wrap",
        invert && "chat-markdown-invert",
        className
      )}
      mode={isAnimating ? "streaming" : "static"}
      isAnimating={isAnimating}
    >
      {children}
    </Streamdown>
  );
}
