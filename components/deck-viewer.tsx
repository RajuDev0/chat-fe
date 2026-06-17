"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import { DeckSlides } from "@/components/deck-slides";

type DeckViewerProps = {
  chatId: string;
  slideCount: number;
  version?: number | null;
  title?: string;
  onClose: () => void;
};

// Full-screen overlay — the "expand" view for inspecting the deck at maximum size. Slides keep
// their exact original aspect ratio (DeckSlides uses object-contain). Esc closes.
export function DeckViewer({
  chatId,
  slideCount,
  version,
  title,
  onClose,
}: DeckViewerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/85 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-5 py-3 text-white/90">
        <span className="truncate text-[15px] font-medium">
          {title || "Deck preview"}
        </span>
        {typeof version === "number" ? (
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[12px]">
            v{version}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-full p-1.5 text-white/90 transition-colors hover:bg-white/15"
          aria-label="Close viewer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 pb-4">
        <DeckSlides
          key={`${chatId}-${version ?? "latest"}`}
          chatId={chatId}
          slideCount={slideCount}
          version={version}
          dark
          enableKeys
        />
      </div>
    </div>
  );
}
