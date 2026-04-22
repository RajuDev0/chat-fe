"use client";

import {
  ArrowUp,
  FileBadge,
  FileText,
  FileType,
  MessageSquarePlus,
  MoonStar,
  Paperclip,
  Sparkles,
  SunMedium,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { ChatMarkdown } from "@/components/chat-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Attachment = {
  id: string;
  name: string;
  sizeLabel: string;
  kind: string;
};

type Message = {
  id: number;
  role: "assistant" | "user";
  content: string;
  attachments?: Attachment[];
};

type ComposerSubmitPayload = {
  attachments: Attachment[];
  content: string;
};

function getFileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function AttachmentIcon({ name }: { name: string }) {
  const extension = getFileExtension(name);

  if (extension === "pdf") {
    return <FileBadge className="h-3.5 w-3.5" />;
  }

  if (extension === "doc" || extension === "docx") {
    return <FileType className="h-3.5 w-3.5" />;
  }

  return <FileText className="h-3.5 w-3.5" />;
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function buildAssistantReply(message: string, attachments: Attachment[]) {
  const normalized = message.trim();
  const summary = normalized || "the uploaded files";

  const fileBlock =
    attachments.length > 0
      ? `\n\n### Attachments\n${attachments
          .map((file) => `- \`${file.name}\` (${file.sizeLabel})`)
          .join("\n")}`
      : "";

  return [
    `Hey! Here's a quick response for **${summary.slice(0, 160)}**.`,
    "",
    "### Next steps",
    "- Refine the request with the exact output you want",
    "- Add constraints like tone, format, or framework",
    "- Use the attached files as context for the next turn",
    fileBlock,
  ]
    .join("\n")
    .trim();
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove?: (id: string) => void;
}) {
  function handleRemove() {
    onRemove?.(attachment.id);
  }

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-xs text-foreground">
      <AttachmentIcon name={attachment.name} />
      <span className="max-w-[280px] truncate">{attachment.name}</span>
      <span className="shrink-0 text-muted-foreground">{attachment.sizeLabel}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={handleRemove}
          className="cursor-pointer rounded-full p-0.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          aria-label={`Remove ${attachment.name}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

function Composer({
  isDocked,
  onSubmitMessage,
}: {
  isDocked: boolean;
  onSubmitMessage: (payload: ComposerSubmitPayload) => void;
}) {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 220)}px`;
  }, [draft]);

  function resetComposer() {
    setDraft("");
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function submitMessage() {
    const content = draft.trim();
    if (!content && attachments.length === 0) {
      return;
    }

    onSubmitMessage({
      attachments,
      content,
    });
    resetComposer();
  }

  function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    const nextAttachments = Array.from(files).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      sizeLabel: formatBytes(file.size),
      kind: file.type || "file",
    }));

    setAttachments((current) => {
      const merged = [...current];

      for (const attachment of nextAttachments) {
        if (!merged.some((existing) => existing.id === attachment.id)) {
          merged.push(attachment);
        }
      }

      return merged;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }

  function focusTextarea() {
    textareaRef.current?.focus();
  }

  function handleDraftChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value);
  }

  function handleTextareaKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitMessage();
    }
  }

  function handleFileInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    handleFilesSelected(event.target.files);
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleSubmitClick() {
    submitMessage();
  }

  return (
    <div
      className={`w-full bg-transparent transition-all ${isDocked ? "backdrop-blur-xl" : ""}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment) => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              onRemove={removeAttachment}
            />
          ))}
        </div>
      )}

      <div
        className="cursor-text rounded-xl border border-border bg-card p-3 shadow-sm"
        onClick={focusTextarea}
      >
        <div className="relative cursor-text rounded-md bg-transparent px-1.5 pt-1.5">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder={isDocked ? "Reply..." : "How can I help you today?"}
            className="max-h-[220px] min-h-12 cursor-text rounded-none bg-transparent text-[15px] leading-6 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-md"
              onClick={openFilePicker}
              aria-label="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          <Button
            type="button"
            size="icon"
            onClick={handleSubmitClick}
            className="h-8 w-8 rounded-md"
            aria-label="Send message"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChatShell() {
  const { resolvedTheme, setTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatVersion, setChatVersion] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  function submitMessage({ content, attachments }: ComposerSubmitPayload) {
    const nextUserMessage: Message = {
      id: Date.now(),
      role: "user",
      content: content || "Attached files for review.",
      attachments,
    };

    const assistantMessage: Message = {
      id: Date.now() + 1,
      role: "assistant",
      content: buildAssistantReply(content, attachments),
    };

    setMessages((current) => [...current, nextUserMessage, assistantMessage]);
  }

  function startNewChat() {
    setMessages([]);
    setChatVersion((current) => current + 1);
  }

  function handleThemeToggle() {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  }

  function handleNewChat() {
    startNewChat();
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--hero-glow),_transparent_60%)]" />

      <div className="fixed right-4 top-4 z-20 flex items-center gap-2 sm:right-8 sm:top-6">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-full bg-card"
          onClick={handleThemeToggle}
          aria-label="Toggle theme"
        >
          {resolvedTheme === "light" ? (
            <MoonStar className="h-4 w-4" />
          ) : (
            <SunMedium className="h-4 w-4" />
          )}
        </Button>

        {hasMessages && (
          <Button
            type="button"
            variant="outline"
            className="rounded-full bg-card px-4"
            onClick={handleNewChat}
          >
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </Button>
        )}
      </div>

      {!hasMessages ? (
        <main className="relative flex min-h-screen items-center justify-center px-4 sm:px-6">
          <div className="w-full max-w-3xl">
            <div className="mb-7 flex flex-col items-center text-center">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-primary" />
                <h1 className="font-serif text-4xl tracking-tight text-[var(--welcome-accent)] sm:text-6xl">
                  Back at it, Raju
                </h1>
              </div>
            </div>

            <Composer
              key={`empty-${chatVersion}`}
              isDocked={false}
              onSubmitMessage={submitMessage}
            />
          </div>
        </main>
      ) : (
        <main className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col px-4 pb-44 pt-24 sm:px-6">
          <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8">
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <article
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      isUser
                        ? "rounded-[20px] bg-primary px-4 py-3 text-primary-foreground"
                        : "px-1 py-1 text-foreground"
                    }`}
                  >
                    {message.attachments && message.attachments.length > 0 && (
                      <div className={`mb-3 flex flex-wrap gap-2 ${isUser ? "" : "ml-0.5"}`}>
                        {message.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className={
                              isUser
                                ? "rounded-2xl bg-primary-foreground/10 text-primary-foreground"
                                : ""
                            }
                          >
                            <AttachmentChip attachment={attachment} />
                          </div>
                        ))}
                      </div>
                    )}

                    <ChatMarkdown
                      invert={isUser}
                      className={isUser ? "text-[15px]" : "text-[17px]"}
                    >
                      {message.content}
                    </ChatMarkdown>
                  </div>
                </article>
              );
            })}
            <div ref={endRef} />
          </section>

          <div className="pointer-events-none fixed inset-x-0 bottom-0 h-36 bg-[linear-gradient(180deg,var(--composer-fade-start),var(--composer-fade-end)_42%,var(--app-bg))]" />
          <div className="fixed inset-x-0 bottom-0 px-4 pb-5 sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
              <Composer
                key={`chat-${chatVersion}`}
                isDocked
                onSubmitMessage={submitMessage}
              />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
