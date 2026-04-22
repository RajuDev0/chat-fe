"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type ChatMarkdownProps = {
  className?: string;
  children: string;
  invert?: boolean;
};

export function ChatMarkdown({
  className,
  children,
  invert = false,
}: ChatMarkdownProps) {
  return (
    <div className={cn("chat-markdown", invert && "chat-markdown-invert", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ className: linkClassName, ...props }) => (
            <a
              className={cn(
                "font-medium underline underline-offset-4",
                linkClassName
              )}
              rel="noreferrer"
              target="_blank"
              {...props}
            />
          ),
          code: ({
            className: codeClassName,
            children: codeChildren,
            ...props
          }) => {
            const isBlock = codeClassName?.includes("language-");

            if (isBlock) {
              return (
                <code className={cn("block", codeClassName)} {...props}>
                  {codeChildren}
                </code>
              );
            }

            return (
              <code className={cn("inline-code", codeClassName)} {...props}>
                {codeChildren}
              </code>
            );
          },
          pre: ({ className: preClassName, ...props }) => (
            <pre className={cn("code-block", preClassName)} {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
