"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProgressStep = {
  label: string;
  status: "pending" | "active" | "done";
};

export type ProgressData = {
  title?: string;
  steps: ProgressStep[];
  done?: boolean;
};

export function ProgressSteps({ progress }: { progress: ProgressData }) {
  const steps = progress.steps ?? [];
  // collapse automatically once everything is done; user can still toggle.
  const [open, setOpen] = useState(true);
  if (steps.length === 0) return null;

  const doneCount = steps.filter((s) => s.status === "done").length;
  const allDone = progress.done || doneCount === steps.length;
  const collapsed = allDone && !open;

  return (
    <div className="my-2 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
      >
        {allDone ? (
          <Check className="h-4 w-4 shrink-0 text-emerald-500" />
        ) : (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        )}
        <span className="flex-1 text-[13px] font-medium text-foreground">
          {allDone ? "Deck ready" : progress.title || "Generating your deck"}
        </span>
        <span className="text-[12px] font-semibold text-muted-foreground">
          {doneCount}/{steps.length}
        </span>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {!collapsed ? (
        <ol className="border-t border-border px-4 py-2">
          {steps.map((step, i) => (
            <li key={`${step.label}-${i}`} className="flex items-center gap-3 py-1.5">
              <StepIcon status={step.status} />
              <span
                className={cn(
                  "text-[13px]",
                  step.status === "done" && "text-muted-foreground",
                  step.status === "active" && "font-medium text-foreground",
                  step.status === "pending" && "text-muted-foreground/60"
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function StepIcon({ status }: { status: ProgressStep["status"] }) {
  if (status === "done") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <Check className="h-3 w-3 text-emerald-500" />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
    </span>
  );
}
