"use client";

import {
  ArrowDown,
  ArrowUp,
  Download,
  Eye,
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
import { ContentPlan, type ContentPlanData } from "@/components/content-plan";
import { DeckPanel } from "@/components/deck-panel";
import { ProgressSteps, type ProgressData } from "@/components/progress-steps";
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
  plan?: ContentPlanData | null;
  progress?: ProgressData | null;
  download?: {
    chatId: string;
    filename: string;
    path?: string;
    version?: number | null;
    slideCount?: number | null;
  } | null;
};

type ComposerSubmitPayload = {
  attachments: Attachment[];
  content: string;
};

type LegalAgentRequestPayload = ComposerSubmitPayload & {
  pendingAssistantId: string;
};

type AgentKey = "legal_agent" | "ppt_v2";

type AgentOption = {
  key: AgentKey;
  label: string;
  description: string;
};

const AGENT_OPTIONS: AgentOption[] = [
  {
    key: "legal_agent",
    label: "Legal Agent",
    description: "Legal Q&A and contract assistance.",
  },
  {
    key: "ppt_v2",
    label: "PPT Stream V2",
    description: "Create or refine presentation content. do it ",
  },
];

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

function createId() {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === "function"
  ) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  // RFC 4122 version 4 UUID bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

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

function detectLanguageFamily(text: string) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text)
    ? "arabic"
    : "latin";
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
  const [chatId, setChatId] = useState(() => createId());
  const [selectedAgent, setSelectedAgent] = useState<AgentKey | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [deck, setDeck] = useState<{
    messageId: string;
    chatId: string;
    slideCount: number;
    version?: number | null;
    title?: string;
  } | null>(null);
  // deck panel defaults to 60% of the viewport (chat keeps the remaining 40%); user can drag.
  const [deckWidth, setDeckWidth] = useState(() =>
    typeof window !== "undefined" ? Math.round(window.innerWidth * 0.6) : 720
  );
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
    formData.append("mode", "qna");
    formData.append("chat_id", chatId);
    formData.append("language_family", detectLanguageFamily(content || chatId));
    formData.append("query", content || "Ask a legal question.");
    formData.append("selected_models", "groq/gpt-oss:120b");
    formData.append("knowledge_names", "contract");

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

          if (event.type === "content_plan") {
            setActivity(null);
            const plan = event.content as ContentPlanData | undefined;
            if (plan && Array.isArray(plan.slides)) {
              updateAssistant((message) => ({ ...message, plan }));
            }
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
                : "Failed to reach the legal agent man.";
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


  async function callPptV2Agent({
    content,
    pendingAssistantId,
  }: LegalAgentRequestPayload) {
    const configuredModel =
      process.env.NEXT_PUBLIC_PPT_MODEL ??
      process.env.NEXT_PUBLIC_PPT_V2_MODEL ??
      "openai/qwen3.6:27b";
    const payload = {
      chat_id: chatId,
      job_id: createId(),
      query: content || "Create a presentation of template.",
      selected_models: [configuredModel],
    };

    activeRequestAbortRef.current?.abort();
    const abortController = new AbortController();
    activeRequestAbortRef.current = abortController;

    function setActivity(activity: StreamActivity | null) {
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingAssistantId ? { ...message, activity } : message
        )
      );
    }

    function updateAssistant(updater: (message: Message) => Message) {
      setMessages((current) =>
        current.map((message) =>
          message.id === pendingAssistantId ? updater(message) : message
        )
      );
    }

    let response: Response;
    try {
      response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ppt_generator/deck/stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_AI_API_TOKEN ?? ""}`,
          },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        }
      );
    } catch (error) {
      activeRequestAbortRef.current = null;
      throw error;
    }

    if (!response.ok) {
      activeRequestAbortRef.current = null;
      throw new Error(`PPT V2 request failed with status ${response.status}`);
    }

    if (!response.body) {
      activeRequestAbortRef.current = null;
      throw new Error("PPT V2 stream body is empty.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistantContent = "";

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

          if (event.type === "metadata") {
            // the deck is rendered → capture the .pptx so we can show a download button
            const c = event.content as
              | {
                  file_path?: string;
                  output_pptx_path?: string;
                  file_paths?: string[];
                  version?: number | null;
                  slide_count?: number | null;
                }
              | undefined;
            const p =
              c?.file_path ||
              c?.output_pptx_path ||
              (Array.isArray(c?.file_paths) ? c?.file_paths?.[0] : "") ||
              "";
            const path = String(p);
            const filename = path.split("/").pop() || "";
            if (filename.toLowerCase().endsWith(".pptx")) {
              // version is the snapshot this turn produced — downloading this turn re-renders
              // that exact version on the fly (not the latest deck). path is the exact deck path
              // the backend advertised — we send it back so it serves that file verbatim.
              const version =
                typeof c?.version === "number" ? c.version : null;
              const slideCount =
                typeof c?.slide_count === "number" ? c.slide_count : null;
              const dl = { chatId, filename, path, version, slideCount };
              updateAssistant((message) => ({ ...message, download: dl }));
              // auto-activate this fresh deck/version in the side panel so the user sees the new
              // render immediately (no need to click View each turn). The View button on this
              // message highlights because deck.messageId matches it; DeckSlides re-fetches since
              // its version prop changed.
              if (typeof slideCount === "number" && slideCount > 0) {
                setDeck({
                  messageId: pendingAssistantId,
                  chatId,
                  slideCount,
                  version,
                  title: filename.replace(/\.pptx$/i, ""),
                });
              }
            }
            continue;
          }

          if (event.type === "planning") {
            setActivity(null);
            // planning carries a bare todos array [{content, status}] (same shape as the
            // other pptx pipeline); a plain string is just an activity/status line.
            const todos = event.content as ProgressData | undefined;
            if (Array.isArray(todos)) {
              updateAssistant((message) => ({ ...message, progress: todos }));
            } else if (typeof event.content === "string") {
              setActivity({ type: "status", title: event.content });
            }
            continue;
          }

          if (event.type === "content_plan") {
            setActivity(null);
            const plan = event.content as ContentPlanData | undefined;
            if (plan && Array.isArray(plan.slides)) {
              // a plan supersedes any in-flight generation stepper
              updateAssistant((message) => ({ ...message, plan, progress: null }));
            }
            continue;
          }

          if (event.type === "final_answer") {
            setActivity(null);
            assistantContent = String(event.content || "").trim();
            updateAssistant((message) => ({
              ...message,
              content: assistantContent || "No response returned.",
              streaming: false,
              // drop a still-running indicator; keep a fully-completed todos list (collapsed).
              progress:
                Array.isArray(message.progress) &&
                message.progress.length > 0 &&
                message.progress.every((t) => t.status === "completed")
                  ? message.progress
                  : null,
            }));
            continue;
          }

          if (event.type === "error") {
            setActivity({
              type: "error",
              title: "Stream error",
              description: String(event.content || "Unknown error"),
            });
            assistantContent = String(event.content || "Failed to reach PPT V2.");
            updateAssistant((message) => ({
              ...message,
              content: assistantContent,
              streaming: false,
            }));
          }
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
  async function downloadPptx(
    chatIdForFile: string,
    filename: string,
    version?: number | null,
    path?: string
  ) {
    // the download endpoint is auth-protected, so fetch with the bearer token and save the
    // blob (a plain <a href> can't send the Authorization header). The deck is identified by
    // version or path (no filename in the URL): when a version is attached to this turn, ask the
    // backend to render THAT version on the fly (not the latest deck); otherwise pass the exact
    // deck path the metadata advertised so it serves that file. `filename` is only the saved name.
    try {
      const params = new URLSearchParams();
      if (typeof version === "number") params.set("version", String(version));
      if (path) params.set("path", path);
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/ppt_generator/download/${chatIdForFile}${query}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_AI_API_TOKEN ?? ""}`,
          },
        }
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* swallow — a failed download shouldn't break the chat */
    }
  }

  async function submitMessage({ content, attachments }: ComposerSubmitPayload) {
    if (!selectedAgent) {
      return;
    }

    const nextUserMessage: Message = {
      id: createId(),
      role: "user",
      content: content || "Attached files.",
      attachments,
    };

    const pendingAssistantId = createId();
    const assistantMessage: Message = {
      id: pendingAssistantId,
      role: "assistant",
      content: "",
      activity: null,
      streaming: true,
    };

    setMessages((current) => [...current, nextUserMessage, assistantMessage]);

    try {
      const result =
        selectedAgent === "ppt_v2"
          ? await callPptV2Agent({
            content,
            attachments,
            pendingAssistantId,
          })
          : await callLegalAgent({
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
          : selectedAgent === "ppt_v2"
            ? "Failed to reach PPT V2."
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
    setChatId(createId());
    setSelectedAgent(null);
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

            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {AGENT_OPTIONS.map((agent) => {
                const isSelected = selectedAgent === agent.key;
                return (
                  <button
                    key={agent.key}
                    type="button"
                    onClick={() => setSelectedAgent(agent.key)}
                    className={`rounded-2xl border p-4 text-left transition ${isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                      }`}
                    aria-pressed={isSelected}
                  >
                    <div className="text-sm font-semibold">{agent.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {agent.description}
                    </div>
                  </button>
                );
              })}
            </div>

            <Composer
              key={`empty-${chatVersion}`}
              isDocked={false}
              onSubmitMessage={(payload) => {
                if (!selectedAgent) {
                  return;
                }
                submitMessage(payload);
              }}
            />
          </div>
        </main>
      ) : (
        <main
          className={`relative h-screen px-4 pt-24 transition-[padding] duration-200 sm:px-6 ${
            deck ? "w-full" : "mx-auto w-full max-w-4xl"
          }`}
          style={deck ? { paddingRight: deckWidth } : undefined}
        >
          <div
            ref={scrollContainerRef}
            className="chat-scrollbar h-full overflow-y-auto pb-44 pr-1"
            onScroll={(event) => syncBottomState(event.currentTarget)}
          >
            <section className="mx-auto flex w-full max-w-3xl flex-col gap-8">
              {messages.map((message) => {
                const isUser = message.role === "user";
                const isThinking =
                  !isUser &&
                  message.streaming &&
                  !message.content.trim() &&
                  !message.progress &&
                  !message.plan;

                return (
                  <article
                    key={message.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] ${isUser
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

                      {!isUser && message.progress ? (
                        <ProgressSteps progress={message.progress} />
                      ) : null}

                      {!isUser && message.plan ? (
                        <ContentPlan plan={message.plan} />
                      ) : null}

                      {isThinking ? (
                        <AssistantThinkingLine activity={message.activity} />
                      ) : message.content.trim() ? (
                        <ChatMarkdown
                          invert={isUser}
                          isAnimating={Boolean(message.streaming && !isUser)}
                          className={isUser ? "text-[15px]" : "text-[17px]"}
                        >
                          {message.content}
                        </ChatMarkdown>
                      ) : null}

                      {!isUser && message.download ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {message.download.slideCount ? (
                            <button
                              type="button"
                              onClick={() =>
                                setDeck({
                                  messageId: message.id,
                                  chatId: message.download!.chatId,
                                  slideCount: message.download!.slideCount!,
                                  version: message.download!.version,
                                  title: message.download!.filename?.replace(
                                    /\.pptx$/i,
                                    ""
                                  ),
                                })
                              }
                              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium transition-colors ${
                                deck?.messageId === message.id
                                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                                  : "border-border bg-background text-foreground hover:bg-muted"
                              }`}
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() =>
                              downloadPptx(
                                message.download!.chatId,
                                message.download!.filename,
                                message.download!.version,
                                message.download!.path
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                          >
                            <Download className="h-4 w-4" />
                            Download PPTX
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              <div ref={endRef} />
            </section>
          </div>

          {deck ? (
            <DeckPanel
              chatId={deck.chatId}
              slideCount={deck.slideCount}
              version={deck.version}
              title={deck.title}
              width={deckWidth}
              onWidthChange={setDeckWidth}
              onClose={() => setDeck(null)}
            />
          ) : null}

          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 h-36 bg-[linear-gradient(180deg,var(--composer-fade-start),var(--composer-fade-end)_42%,var(--app-bg))]"
            style={deck ? { right: deckWidth } : undefined}
          />
          {showScrollToBottom && (
            <div
              className="fixed bottom-28 right-4 z-20 sm:right-8"
              style={deck ? { right: deckWidth + 16 } : undefined}
            >
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
          <div
            className="fixed inset-x-0 bottom-0 px-4 pb-5 transition-[right] duration-200 sm:px-6"
            style={deck ? { right: deckWidth } : undefined}
          >
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
