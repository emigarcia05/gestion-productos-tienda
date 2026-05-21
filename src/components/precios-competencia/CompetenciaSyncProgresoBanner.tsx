"use client";

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompetenciaSyncStatusPoll } from "@/hooks/useCompetenciaSyncStatusPoll";

export default function CompetenciaSyncProgresoBanner() {
  const { running, processed, total, error } = useCompetenciaSyncStatusPoll(true);

  if (!running && !error) return null;

  const pct = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return (
    <div
      className={cn(
        "flex w-full shrink-0 items-center gap-3 rounded-lg border px-4 py-2 text-sm",
        running ? "border-primary/40 bg-primary/10" : "border-border bg-muted"
      )}
      role="status"
      aria-live="polite"
    >
      {running ? (
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden />
      ) : null}
      <div className="min-w-0 flex-1">
        {running ? (
          <>
            <p className="font-semibold text-foreground">Comparación de competencia en curso</p>
            <p className="text-muted-foreground">
              Consultando URL {processed} de {total} ({pct}%)
            </p>
          </>
        ) : error ? (
          <p className="text-muted-foreground">Última comparación: {error}</p>
        ) : null}
      </div>
    </div>
  );
}
