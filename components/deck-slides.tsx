"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DeckSlidesProps = {
  chatId: string;
  slideCount: number;
  version?: number | null;
  /** style the controls for a dark (full-screen) vs light (docked panel) backdrop */
  dark?: boolean;
  /** only one mounted instance should own the keyboard (avoid double-handling) */
  enableKeys?: boolean;
};

type BatchSlide = { index: number; etag: string; svg: string };

// Fetch the WHOLE deck in ONE request — every slide's SVG inline — then turn each into an object
// URL locally. The endpoint is auth-protected (bearer header), and `fetch` uses the browser HTTP
// cache, so the backend's ETag means a reopened/unchanged deck revalidates with a cheap 304
// instead of re-sending the payload.
async function fetchDeckBatch(
  chatId: string,
  version?: number | null
): Promise<BatchSlide[] | null> {
  try {
    const params = new URLSearchParams();
    if (typeof version === "number") params.set("version", String(version));
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/ppt_generator/preview/${chatId}/batch${qs}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_AI_API_TOKEN ?? ""}`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data?.slides) ? (data.slides as BatchSlide[]) : null;
  } catch {
    return null;
  }
}

// The reusable deck carousel core — Embla stage + thumbnail rail. Fills its parent container, so
// the SAME component serves both the docked side panel and the full-screen overlay. Slides are
// SVG and always rendered `object-contain`, so the deck keeps its EXACT original aspect ratio
// (never stretched/cropped) and scales losslessly to whatever space the parent gives it.
export function DeckSlides({
  chatId,
  slideCount,
  version,
  dark = false,
  enableKeys = true,
}: DeckSlidesProps) {
  // undefined = not loaded yet, null = missing/failed, string = object URL. Filled in one shot
  // from the single batch request below (index-aligned: urls[i] ↔ slide i+1).
  const [urls, setUrls] = useState<(string | null | undefined)[]>([]);
  const [selected, setSelected] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const railRef = useRef<HTMLDivElement | null>(null);

  // every object URL we created, for cleanup; selectedRef mirrors `selected` so an async refetch
  // can read the latest viewed slide without re-running on every selection change.
  const createdRef = useRef<string[]>([]);
  const selectedRef = useRef(0);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // duration: lower = snappier slide transitions (Embla default ~25)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    duration: 15,
  });

  // ONE request loads the whole deck; re-runs when the deck/version changes (an edit turn). The
  // component is keyed on chatId only (NOT version) so an edit does NOT remount/reset — we keep the
  // user on the slide they were viewing instead of snapping back to slide 1.
  useEffect(() => {
    if (!chatId || slideCount < 1) return;
    let cancelled = false;
    const keepIndex = selectedRef.current; // where the user is, to restore after the refetch
    (async () => {
      const slides = await fetchDeckBatch(chatId, version);
      if (cancelled || !slides) return;
      const prev = createdRef.current;
      const created: string[] = [];
      const next: (string | null)[] = new Array(slideCount).fill(null);
      for (const s of slides) {
        const i = s.index - 1;
        if (i < 0 || i >= slideCount || !s.svg) continue;
        const url = URL.createObjectURL(
          new Blob([s.svg], { type: "image/svg+xml" })
        );
        created.push(url);
        next[i] = url;
      }
      if (cancelled) {
        created.forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      createdRef.current = created;
      setUrls(next);
      prev.forEach((u) => URL.revokeObjectURL(u)); // free the previous batch
      // if the deck count changed, embla reInits to slide 0 — restore the viewed slide
      const target = Math.min(keepIndex, slideCount - 1);
      if (target > 0) {
        requestAnimationFrame(() => emblaApi?.scrollTo(target, true));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId, slideCount, version, emblaApi]);

  // Revoke any object URLs we created on unmount.
  useEffect(() => {
    return () => {
      createdRef.current.forEach((u) => URL.revokeObjectURL(u));
      createdRef.current = [];
    };
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!enableKeys) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") scrollNext();
      else if (e.key === "ArrowLeft") scrollPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableKeys, scrollNext, scrollPrev]);

  useEffect(() => {
    const active = railRef.current?.querySelector<HTMLElement>(
      `[data-idx="${selected}"]`
    );
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selected]);

  // theme-driven nav buttons. In the docked panel they match the app's button style; over the
  // dark full-screen scrim they use a translucent light treatment so they stay visible.
  const arrowCls = dark
    ? "bg-white/10 text-white hover:bg-white/20"
    : "border border-border bg-background text-foreground shadow-sm hover:bg-muted hover:text-primary";

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* stage */}
      <div className="relative flex min-h-0 flex-1 items-center px-3">
        <button
          type="button"
          onClick={scrollPrev}
          disabled={!canPrev}
          className={cn(
            "absolute left-2 z-10 rounded-full p-2 transition-colors disabled:opacity-30",
            arrowCls
          )}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="h-full w-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {Array.from({ length: slideCount }, (_, i) => (
              <div
                key={i}
                className="flex min-w-0 flex-[0_0_100%] items-center justify-center px-2"
              >
                {urls[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urls[i] as string}
                    alt={`Slide ${i + 1}`}
                    // object-contain → exact original aspect ratio, never distorted
                    className="max-h-full max-w-full object-contain shadow-xl"
                    draggable={false}
                  />
                ) : (
                  <div
                    className={cn(
                      "flex aspect-video w-[88%] items-center justify-center rounded-lg",
                      dark ? "bg-white/5 text-white/50" : "bg-muted text-muted-foreground"
                    )}
                  >
                    Loading slide…
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={scrollNext}
          disabled={!canNext}
          className={cn(
            "absolute right-2 z-10 rounded-full p-2 transition-colors disabled:opacity-30",
            arrowCls
          )}
          aria-label="Next slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* current-slide counter — solid themed chip so it's readable over any slide */}
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border bg-popover px-3 py-1 text-[14px] font-semibold tabular-nums text-popover-foreground shadow-md">
          {selected + 1} / {slideCount}
        </div>
      </div>

      {/* thumbnail rail */}
      <div ref={railRef} className="flex shrink-0 gap-2 overflow-x-auto px-3 py-2">
        {Array.from({ length: slideCount }, (_, i) => (
          <button
            key={i}
            type="button"
            data-idx={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn(
              "relative h-[52px] w-[92px] shrink-0 overflow-hidden rounded border bg-muted transition-all",
              i === selected
                ? "border-primary ring-2 ring-primary"
                : dark
                  ? "border-white/20 opacity-70 hover:opacity-100"
                  : "border-border opacity-80 hover:opacity-100"
            )}
            title={`Slide ${i + 1}`}
          >
            {urls[i] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urls[i] as string}
                alt={`Slide ${i + 1}`}
                className="h-full w-full object-contain"
                draggable={false}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                …
              </span>
            )}
            <span className="absolute bottom-0.5 left-0.5 rounded border border-border bg-popover px-1.5 py-0.5 text-[12px] font-semibold leading-none text-popover-foreground">
              {i + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
