import { cn } from "@/lib/utils";

export type ContentPlanSlide = {
  n: number;
  type: string;
  key_message: string;
  section?: string;
  subtitle?: string; // the slide's secondary line — shown under the title, not as a bullet
  content?: string[]; // real line-by-line slide content (bullets / body) for review
};

export type ContentPlanData = {
  deck_title?: string;
  narrative?: string;
  slides: ContentPlanSlide[];
};

// Group slide types into a few visual families so the chips read at a glance.
function chipClass(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("title") || t.includes("cover"))
    return "bg-primary/15 text-primary";
  if (t.includes("divider") || t.includes("section"))
    return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  if (t.includes("end") || t.includes("closing") || t.includes("thank"))
    return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
  if (t.includes("toc") || t.includes("contents") || t.includes("agenda"))
    return "bg-sky-500/15 text-sky-600 dark:text-sky-400";
  if (
    t.includes("chart") ||
    t.includes("metric") ||
    t.includes("stat") ||
    t.includes("data")
  )
    return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  return "bg-muted text-muted-foreground";
}

// Human-readable labels for the internal recipe/intent/layout ids. Anything not listed falls
// back to a tidy title-cased version of the raw id.
const TYPE_LABELS: Record<string, string> = {
  // structural
  title: "Title",
  table_of_contents: "Agenda",
  divider: "Section",
  ending: "Closing",
  // recipes
  card_grid: "Cards",
  stat_band: "Key Stats",
  hero_stat: "Big Number",
  lead_visual: "Chart + Points",
  process_strip: "Process",
  framework: "Matrix",
  compare_2up: "Comparison",
  spotlight: "Quote",
  image_split: "Image + Points",
  numbered_points: "Numbered List",
  // intents
  timeline: "Timeline",
  list: "List",
  narrative: "Text",
  quote: "Quote",
  chart: "Chart",
  matrix: "Matrix",
  flow: "Flow",
  metrics: "Key Stats",
  features: "Features",
  comparison: "Comparison",
  process: "Process",
  content: "Content",
};

function prettyType(type: string): string {
  const key = (type || "content").toLowerCase();
  if (TYPE_LABELS[key]) return TYPE_LABELS[key];
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ContentPlan({ plan }: { plan: ContentPlanData }) {
  const slides = plan.slides ?? [];
  if (slides.length === 0) return null;

  return (
    <div className="my-2 w-full overflow-hidden rounded-2xl border border-border bg-card">
      {/* header */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>Deck Content</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {slides.length} slides
          </span>
        </div>
        {plan.deck_title ? (
          <h3 className="mt-1 text-[15px] font-semibold text-foreground">
            {plan.deck_title}
          </h3>
        ) : null}
        {plan.narrative ? (
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            {plan.narrative}
          </p>
        ) : null}
      </div>

      {/* slide rows */}
      <ol className="divide-y divide-border">
        {slides.map((s, i) => (
          <li
            key={`${s.n}-${i}`}
            className="flex items-start gap-3 px-4 py-2.5"
          >
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-semibold text-muted-foreground">
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    chipClass(s.type)
                  )}
                >
                  {prettyType(s.type)}
                </span>
                {s.section ? (
                  <span className="text-[11px] text-muted-foreground">
                    {s.section}
                  </span>
                ) : null}
              </div>
              {s.key_message ? (
                <p className="mt-0.5 text-[14px] font-semibold leading-snug text-foreground">
                  {s.key_message}
                </p>
              ) : null}
              {s.subtitle ? (
                <p className="mt-0.5 text-[12.5px] italic leading-snug text-muted-foreground">
                  {s.subtitle}
                </p>
              ) : null}
              {s.content && s.content.length > 0 ? (
                <ul className="mt-1 space-y-0.5">
                  {s.content.map((line, j) => (
                    <li
                      key={j}
                      className="flex gap-1.5 text-[12.5px] leading-snug text-muted-foreground"
                    >
                      <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                      <span className="min-w-0">{line}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
