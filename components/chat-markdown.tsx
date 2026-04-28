"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

import { cn } from "@/lib/utils";
import { SyntaxHighlighter } from "@/components/syntax-highlighter";

type ChatMarkdownProps = {
  className?: string;
  children: string;
  invert?: boolean;
  isAnimating?: boolean;
};

function normalizeMarkdown(value: string, _isAnimating: boolean) {
  const sectionTitles = [
    "Executive Summary",
    "Risks",
    "Gaps",
    "Conflicts",
    "Recommended Next Steps",
  ];

  let content = value
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .trim();

  for (const title of sectionTitles) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    content = content
      .replace(
        new RegExp(`(^|\\n)\\s*#{1,6}\\s*${escapedTitle}\\s*`, "g"),
        `\n\n## ${title}\n\n`
      )
      .replace(
        new RegExp(`([^#\\n])\\s*#{1,6}\\s*${escapedTitle}\\s*`, "g"),
        `$1\n\n## ${title}\n\n`
      )
      .replace(
        new RegExp(`(^|\\n)\\s*${escapedTitle}(?=[A-Z“"‘'\`-])`, "g"),
        `\n\n## ${title}\n\n`
      )
      .replace(
        new RegExp(`([^#\\s\\n])\\s*${escapedTitle}\\s*-\\s*`, "g"),
        `$1\n\n## ${title}\n\n- `
      )
      .replace(
        new RegExp(`^${escapedTitle}\\s*-\\s*`, "g"),
        `## ${title}\n\n- `
      );
  }

  content = content
    .replace(/([.!?])\s*-\s*/g, "$1\n- ")
    .replace(/\s-\s+(?=[A-Z*])/g, "\n- ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  for (const title of sectionTitles) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const titlePattern = new RegExp(
      `(^|\\n)\\s*\\*\\*?${escapedTitle}\\*\\*?\\s*-\\s*`,
      "g"
    );
    content = content.replace(titlePattern, `$1## ${title}\n\n- `);
  }

  return content.replace(/\n{3,}/g, "\n\n").trim();
}

export function ChatMarkdown({
  className,
  children,
  invert = false,
  isAnimating = false,
}: ChatMarkdownProps) {
  const content = normalizeMarkdown(children, isAnimating);

  return (
    <div
      className={cn(
        "chat-markdown break-words",
        invert && "chat-markdown-invert",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ className: headingClassName, ...props }) => (
            <h1
              className={cn(
                "mb-1.5 scroll-m-20 text-4xl font-extrabold tracking-tight last:mb-0",
                headingClassName
              )}
              {...props}
            />
          ),
          h2: ({ className: headingClassName, ...props }) => (
            <h2
              className={cn(
                "mt-4 mb-2 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0",
                headingClassName
              )}
              {...props}
            />
          ),
          h3: ({ className: headingClassName, ...props }) => (
            <h3
              className={cn(
                "mt-2 mb-1 scroll-m-20 text-2xl font-semibold tracking-tight first:mt-0 last:mb-0",
                headingClassName
              )}
              {...props}
            />
          ),
          h4: ({ className: headingClassName, ...props }) => (
            <h4
              className={cn(
                "mt-2 mb-1 scroll-m-20 text-xl font-semibold tracking-tight first:mt-0 last:mb-0",
                headingClassName
              )}
              {...props}
            />
          ),
          h5: ({ className: headingClassName, ...props }) => (
            <h5
              className={cn(
                "my-1.5 text-lg font-semibold first:mt-0 last:mb-0",
                headingClassName
              )}
              {...props}
            />
          ),
          h6: ({ className: headingClassName, ...props }) => (
            <h6
              className={cn("my-1.5 font-semibold first:mt-0 last:mb-0", headingClassName)}
              {...props}
            />
          ),
          p: ({ className: paragraphClassName, ...props }) => (
            <p
              className={cn(
                "my-0.5 leading-6 first:mt-0 last:mb-0",
                paragraphClassName
              )}
              {...props}
            />
          ),
          a: ({ className: linkClassName, ...props }) => (
            <a
              className={cn(
                "text-primary font-medium underline underline-offset-4",
                linkClassName
              )}
              {...props}
            />
          ),
          blockquote: ({ className: blockquoteClassName, ...props }) => (
            <blockquote
              className={cn("my-1.5 border-l-2 pl-4 italic", blockquoteClassName)}
              {...props}
            />
          ),
          ul: ({ className: listClassName, ...props }) => (
            <ul
              className={cn("my-0.5 ml-5 list-disc [&>li]:mt-0 [&>li>p]:my-0", listClassName)}
              {...props}
            />
          ),
          ol: ({ className: listClassName, ...props }) => (
            <ol
              className={cn("my-0.5 ml-5 list-decimal [&>li]:mt-0 [&>li>p]:my-0", listClassName)}
              {...props}
            />
          ),
          hr: ({ className: hrClassName, ...props }) => (
            <hr
              className={cn("my-4 border-b border-border/70", hrClassName)}
              {...props}
            />
          ),
          table: ({ className: tableClassName, ...props }) => (
            <table
              className={cn(
                "my-3 w-full border-separate border-spacing-0 overflow-y-auto",
                tableClassName
              )}
              {...props}
            />
          ),
          th: ({ className: thClassName, ...props }) => (
            <th
              className={cn(
                "bg-muted px-4 py-2 text-left font-bold first:rounded-tl-lg last:rounded-tr-lg [&[align=center]]:text-center [&[align=right]]:text-right",
                thClassName
              )}
              {...props}
            />
          ),
          td: ({ className: tdClassName, ...props }) => (
            <td
              className={cn(
                "border-b border-l px-4 py-2 text-left last:border-r [&[align=center]]:text-center [&[align=right]]:text-right",
                tdClassName
              )}
              {...props}
            />
          ),
          tr: ({ className: trClassName, ...props }) => (
            <tr
              className={cn(
                "m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
                trClassName
              )}
              {...props}
            />
          ),
          sup: ({ className: supClassName, ...props }) => (
            <sup
              className={cn("[&>a]:text-xs [&>a]:no-underline", supClassName)}
              {...props}
            />
          ),
          pre: ({ className: preClassName, ...props }) => (
            <pre
              className={cn(
                "max-w-4xl overflow-x-auto rounded-lg bg-black text-white",
                preClassName
              )}
              {...props}
            />
          ),
          code: ({
            className: codeClassName,
            children: codeChildren,
            ...props
          }) => {
            const match = /language-(\w+)/.exec(codeClassName || "");

            if (match) {
              const language = match[1];
              const code = String(codeChildren).replace(/\n$/, "");

              return (
                <div className="my-3 overflow-hidden rounded-lg border border-border bg-black">
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
                    <span className="lowercase [&>span]:text-xs">{language}</span>
                  </div>
                  <SyntaxHighlighter
                    language={language}
                    className={codeClassName}
                  >
                    {code}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code
                className={cn("rounded font-semibold", codeClassName)}
                {...props}
              >
                {codeChildren}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
