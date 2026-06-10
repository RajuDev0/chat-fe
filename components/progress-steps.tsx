"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Matches the backend `planning` payload (same shape the other pptx pipeline sends):
// a bare todos array of { content, status: pending | in_progress | completed }.
export type TodoItem = {
  content: string;
  status: "pending" | "in_progress" | "completed";
};

export type ProgressData = TodoItem[];

export function ProgressSteps({ progress }: { progress: ProgressData }) {
  const todos = Array.isArray(progress) ? progress : [];
  const [open, setOpen] = useState(true);
  if (todos.length === 0) return null;

  const doneCount = todos.filter((t) => t.status === "completed").length;
  const allDone = doneCount === todos.length;
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
          {allDone ? "Done" : "Working..."}
        </span>
        <span className="text-[12px] font-semibold text-muted-foreground">
          {doneCount}/{todos.length}
        </span>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {!collapsed ? (
        <ol className="border-t border-border px-4 py-2">
          {todos.map((todo, i) => (
            <li key={`${todo.content}-${i}`} className="flex items-center gap-3 py-1.5">
              <StepIcon status={todo.status} />
              <span
                className={cn(
                  "text-[13px]",
                  todo.status === "completed" && "text-muted-foreground",
                  todo.status === "in_progress" && "font-medium text-foreground",
                  todo.status === "pending" && "text-muted-foreground/60"
                )}
              >
                {todo.content}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function StepIcon({ status }: { status: TodoItem["status"] }) {
  if (status === "completed") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
        <Check className="h-3 w-3 text-emerald-500" />
      </span>
    );
  }
  if (status === "in_progress") {
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
