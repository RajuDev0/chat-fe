"use client";

import {
  ArrowDown,
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
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { AgentLoader } from "@/components/agent-loader";
import { ChatMarkdown } from "@/components/chat-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Attachment = {
  id: string;
  name: string;
  sizeLabel: string;
  kind: string;
  file: File;
};

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  attachments?: Attachment[];
  activity?: StreamActivity | null;
  streaming?: boolean;
};

type ComposerSubmitPayload = {
  attachments: Attachment[];
  content: string;
};

type LegalAgentRequestPayload = ComposerSubmitPayload & {
  pendingAssistantId: string;
};

type StreamActivity = {
  type:
    | "status"
    | "uploading_files"
    | "files_ready"
    | "review_ready"
    | "review_started"
    | "tool_start"
    | "tool_end"
    | "error";
  title: string;
  description?: string;
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

function getEventText(event: Record<string, unknown>) {
  const value =
    event.response ??
    event.final_answer ??
    event.content ??
    event.output ??
    event.message;

  if (typeof value !== "string") {
    return "";
  }

  if (event.output && typeof event.output === "string") {
    const match = event.output.match(/content='([^']*)'/);
    if (match?.[1]) {
      return match[1];
    }
  }

  return value;
}

function normalizeStreamText(value: string) {
  return value.replace(/<\|nl\|>/g, "\n");
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

function AssistantThinkingLine({
  activity,
}: {
  activity?: StreamActivity | null;
}) {
  const label = activity?.title || "Agent is thinking...";

  return (
    <div className="mt-3 flex items-center gap-3 px-1 py-1">
      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm">
        <AgentLoader
          type="sparkle"
          className="scale-[0.82]"
          dotClassName="bg-current"
        />
      </span>
      <div className="min-w-0 truncate text-[13px] font-medium text-foreground">
        {label}
      </div>
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
      file,
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
  const [chatId, setChatId] = useState(() => crypto.randomUUID());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const activeRequestAbortRef = useRef<AbortController | null>(null);

  const hasMessages = messages.length > 0;

  function syncBottomState(container: HTMLDivElement) {
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);
    const isNearBottom = distanceFromBottom < 120;
    shouldStickToBottomRef.current = isNearBottom;
    setShowScrollToBottom(!isNearBottom);
  }

  function scrollContainerToBottom(behavior: ScrollBehavior) {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior });
    syncBottomState(container);
  }

  useLayoutEffect(() => {
    const hasNewMessage = messages.length > previousMessageCountRef.current;
    previousMessageCountRef.current = messages.length;

    if (!hasNewMessage && !shouldStickToBottomRef.current) {
      return;
    }

    const firstBehavior: ScrollBehavior = hasNewMessage ? "smooth" : "auto";
    scrollContainerToBottom(firstBehavior);

    // Follow-up pass catches late content growth from rich markdown.
    const timeoutId = window.setTimeout(() => {
      scrollContainerToBottom("auto");
    }, 140);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [messages]);

  async function callLegalAgent({
    content,
    attachments,
    pendingAssistantId,
  }: LegalAgentRequestPayload) {
    console.info("[legal-agent] submitting request", {
      chatId,
      attachmentCount: attachments.length,
      attachmentNames: attachments.map((attachment) => attachment.name),
      hasContent: Boolean(content.trim()),
    });

    const formData = new FormData();
    formData.append("mode", "contract_review");
    formData.append("chat_id", chatId);
    formData.append("language_family", "arabic");
    formData.append("query", content || "Review this contract.");
    formData.append("selected_models", "groq/gpt-oss:120b");

    attachments.forEach((attachment) => {
      formData.append("files", attachment.file);
    });

    activeRequestAbortRef.current?.abort();
    const abortController = new AbortController();
    activeRequestAbortRef.current = abortController;

    function finalizeAssistantMessage(content: string) {
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingAssistantId
            ? {
                ...message,
                content,
                streaming: false,
              }
            : message
        )
      );
    }

    let response: Response;
    try {
      response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/agent_rag/legal_agent/stream`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_AI_API_TOKEN ?? ""}`,
          },
          body: formData,
          signal: abortController.signal,
        }
      );
    } catch (error) {
      activeRequestAbortRef.current = null;
      throw error;
    }

    if (!response.ok) {
      console.error("[legal-agent] request failed", {
        status: response.status,
        chatId,
        attachmentCount: attachments.length,
      });
      activeRequestAbortRef.current = null;
      throw new Error(`Legal agent request failed with status ${response.status}`);
    }

    console.info("[legal-agent] response received", {
      chatId,
      status: response.status,
      attachmentCount: attachments.length,
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.body || !contentType.includes("application/x-ndjson")) {
      const json = (await response.json()) as { response?: string };
      finalizeAssistantMessage(json.response?.trim() || "No response returned.");
      activeRequestAbortRef.current = null;
      return json;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";

    function setActivity(activity: StreamActivity | null) {
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== pendingAssistantId) {
            return message;
          }

          return {
            ...message,
            activity,
          };
        })
      );
    }

    function updateAssistant(
      updater: (message: Message) => Message
    ) {
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingAssistantId ? updater(message) : message
        )
      );
    }

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            continue;
          }

          let event: Record<string, unknown> & { type?: string };
          try {
            event = JSON.parse(trimmed);
          } catch {
            continue;
          }

          if (
            event.type === "status" ||
            event.type === "uploading_files" ||
            event.type === "files_ready" ||
            event.type === "review_ready" ||
            event.type === "review_started"
          ) {
            setActivity({
              type: "status",
              title: String(
                event.message || event.stage || "Agent is thinking..."
              ),
              description:
                typeof event.stage === "string" && event.stage !== "prompt"
                  ? event.stage
                  : undefined,
            });
            continue;
          }

          if (event.type === "tool") {
            const phase = event.phase === "end" ? "end" : "start";
            const toolName = String(event.tool || "unknown");
            setActivity({
              type: phase === "end" ? "tool_end" : "tool_start",
              title:
                phase === "end"
                  ? `Tool result: ${toolName}`
                  : `Tool call: ${toolName}`,
              description:
                typeof event.input === "string"
                  ? event.input
                  : typeof event.output === "string"
                    ? event.output
                    : undefined,
            });
            continue;
          }

          if (event.type === "delta") {
            setActivity(null);
            assistantContent += normalizeStreamText(String(event.content || ""));
            updateAssistant((message) => ({
              ...message,
              content: assistantContent,
            }));
            continue;
          }

          if (
            event.type === "final_answer" ||
            event.type === "final"
          ) {
            setActivity(null);
            const finalText = getEventText(event);
            const preferredFinalText =
              normalizeStreamText(finalText).trim() ||
              assistantContent.trim();
            assistantContent = preferredFinalText;
            updateAssistant((message) => ({
              ...message,
              content: assistantContent || "No response returned.",
              streaming: false,
            }));
            continue;
          }

          if (event.type === "error") {
            setActivity({
              type: "error",
              title: "Stream error",
              description:
                typeof event.message === "string"
                  ? event.message
                  : "Unknown error",
            });
            assistantContent =
              typeof event.message === "string"
                ? event.message
                : "Failed to reach the legal agent.";
            updateAssistant((message) => ({
              ...message,
              content: assistantContent,
              streaming: false,
            }));
          }
        }
      }

      const trailing = buffer.trim();
      if (trailing) {
        try {
          const event = JSON.parse(trailing);
          if (event.type === "final_answer" || event.type === "final") {
            setActivity(null);
            const finalText = getEventText(event);
            const preferredFinalText =
              normalizeStreamText(finalText).trim() ||
              assistantContent.trim();
            assistantContent = preferredFinalText;
            updateAssistant((message) => ({
              ...message,
              content: assistantContent || "No response returned.",
              streaming: false,
            }));
          }
        } catch {
          // Ignore partial trailing data.
        }
      }
    } finally {
      reader.releaseLock();
      if (activeRequestAbortRef.current === abortController) {
        activeRequestAbortRef.current = null;
      }
    }

    return { response: assistantContent };
  }

  async function submitMessage({ content, attachments }: ComposerSubmitPayload) {
    const nextUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: content || "Attached files.",
      attachments,
    };

    const pendingAssistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: pendingAssistantId,
      role: "assistant",
      content: "",
      activity: null,
      streaming: true,
    };

    setMessages((current) => [...current, nextUserMessage, assistantMessage]);

    try {
      const result = await callLegalAgent({
        content,
        attachments,
        pendingAssistantId,
      });
      if (!result.response?.trim()) {
        setMessages((current) =>
          current.map((message) =>
            message.id === pendingAssistantId
              ? {
                  ...message,
                  content: "No response returned.",
                  streaming: false,
                }
              : message
          )
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to reach the legal agent.";

      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === pendingAssistantId
            ? {
                ...message,
                content: errorMessage,
                streaming: false,
              }
            : message
        )
      );
    }
  }

  function startNewChat() {
    activeRequestAbortRef.current?.abort();
    setMessages([]);
    setChatVersion((current) => current + 1);
    setChatId(crypto.randomUUID());
  }

  function handleThemeToggle() {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  }

  function handleNewChat() {
    startNewChat();
  }

  function jumpToBottom() {
    shouldStickToBottomRef.current = true;
    setShowScrollToBottom(false);
    scrollContainerToBottom("smooth");
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
        <main className="relative mx-auto h-screen w-full max-w-4xl px-4 pt-24 sm:px-6">
          <div
            ref={scrollContainerRef}
            className="chat-scrollbar h-full overflow-y-auto pb-44 pr-1"
            onScroll={(event) => syncBottomState(event.currentTarget)}
          >
            <section className="mx-auto flex w-full max-w-3xl flex-col gap-8">
              {messages.map((message) => {
                const isUser = message.role === "user";
                const isThinking = !isUser && message.streaming && !message.content.trim();

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

                      {isThinking ? (
                        <AssistantThinkingLine activity={message.activity} />
                      ) : (
                        <ChatMarkdown
                          invert={isUser}
                          isAnimating={Boolean(message.streaming && !isUser)}
                          className={isUser ? "text-[15px]" : "text-[17px]"}
                        >
                          {message.content}
                        </ChatMarkdown>
                      )}
                    </div>
                  </article>
                );
              })}
              <div ref={endRef} />
            </section>
          </div>

          <div className="pointer-events-none fixed inset-x-0 bottom-0 h-36 bg-[linear-gradient(180deg,var(--composer-fade-start),var(--composer-fade-end)_42%,var(--app-bg))]" />
          {showScrollToBottom && (
            <div className="fixed bottom-28 right-4 z-20 sm:right-8">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-full bg-card"
                onClick={jumpToBottom}
                aria-label="Scroll to latest message"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          )}
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
