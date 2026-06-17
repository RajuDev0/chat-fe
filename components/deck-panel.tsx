"use client";

import { Maximize2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DeckSlides } from "@/components/deck-slides";
import { DeckViewer } from "@/components/deck-viewer";

type DeckPanelProps = {
  chatId: string;
  slideCount: number;
  version?: number | null;
  title?: string;
  width: number;
  onWidthChange: (px: number) => void;
  onClose: () => void;
};

const MIN_W = 380;

// Docked, resizable right panel — sits beside the chat so the deck and the conversation are
// visible at the same time (no open→type→reopen loop). Drag the left edge to resize; "expand"
// opens the full-screen view. Slides keep their original aspect ratio (DeckSlides).
export function DeckPanel({
  chatId,
  slideCount,
  version,
  title,
  width,
  onWidthChange,
  onClose,
}: DeckPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);

  // resize: width = distance from the right edge of the viewport to the pointer
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const max = Math.round(window.innerWidth * 0.8);
      const next = Math.min(max, Math.max(MIN_W, window.innerWidth - e.clientX));
      onWidthChange(next);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, onWidthChange]);

  const startDrag = useCallback(() => setDragging(true), []);

  return (
    <>
      <aside
        className="fixed right-0 top-0 z-30 flex h-screen flex-col border-l border-border bg-card shadow-2xl"
        style={{ width }}
      >
        {/* left-edge resize handle */}
        <div
          onPointerDown={startDrag}
          className="absolute left-0 top-0 z-40 h-full w-1.5 cursor-col-resize hover:bg-primary/40"
          style={dragging ? { background: "var(--primary)" } : undefined}
          aria-label="Resize deck panel"
          role="separator"
        />

        {/* header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
          <span className="truncate text-[14px] font-medium text-foreground">
            {title || "Deck preview"}
          </span>
          {typeof version === "number" ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[12px] text-muted-foreground">
              v{version}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Expand to full screen"
              title="Expand"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close deck panel"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* carousel — keys disabled while the full-screen view owns them */}
        <div className="min-h-0 flex-1 py-2">
          <DeckSlides
            key={chatId}
            chatId={chatId}
            slideCount={slideCount}
            version={version}
            enableKeys={!expanded}
          />
        </div>
      </aside>

      {expanded ? (
        <DeckViewer
          chatId={chatId}
          slideCount={slideCount}
          version={version}
          title={title}
          onClose={() => setExpanded(false)}
        />
      ) : null}
    </>
  );
}
