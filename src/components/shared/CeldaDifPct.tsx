"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { fmtPctEntero } from "@/lib/format";

export default function CeldaDifPct({ pct }: { pct: number | null }) {
  if (pct == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center justify-center gap-0.5 text-foreground font-semibold text-xs tabular-nums leading-tight">
      {pct > 0 && (
        <ArrowUp className="h-3.5 w-3.5 variacion-costo-icon--positiva shrink-0" aria-hidden />
      )}
      {pct < 0 && (
        <ArrowDown className="h-3.5 w-3.5 variacion-costo-icon--negativa shrink-0" aria-hidden />
      )}
      <span>{fmtPctEntero(pct)}</span>
    </span>
  );
}
