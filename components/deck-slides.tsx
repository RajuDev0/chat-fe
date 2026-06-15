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

// Fetch one slide's rendered SVG with the bearer token → object URL. The preview endpoint is
// auth-protected, so a plain <img src> can't reach it (same pattern as the download).
async function fetchSlideUrl(
  chatId: string,
  slideNo: number,
  version?: number | null
): Promise<string | null> {
  try {
    const versionQuery =
      typeof version === "number" ? `?version=${version}` : "";
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/ppt_generator/preview/${chatId}/${slideNo}${versionQuery}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_AI_API_TOKEN ?? ""}`,
        },
      }
    );
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
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
  const [urls, setUrls] = useState<(string | null)[]>([]);
  const [selected, setSelected] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const railRef = useRef<HTMLDivElement | null>(null);

  // duration: lower = snappier slide transitions (Embla default ~25)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    duration: 15,
  });

  useEffect(() => {
    if (!chatId || !slideCount || slideCount < 1) return;
    let cancelled = false;
    const created: string[] = [];
    (async () => {
      const results = await Promise.all(
        Array.from({ length: slideCount }, (_, i) =>
          fetchSlideUrl(chatId, i + 1, version)
        )
      );
      if (cancelled) {
        results.forEach((u) => u && URL.revokeObjectURL(u));
        return;
      }
      results.forEach((u) => u && created.push(u));
      setUrls(results);
    })();
    return () => {
      cancelled = true;
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [chatId, slideCount, version]);

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
