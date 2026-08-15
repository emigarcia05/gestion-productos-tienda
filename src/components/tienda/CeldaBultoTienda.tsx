"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import EnteroStepperInput from "@/components/shared/EnteroStepperInput";
import { guardarBultoTiendaAction } from "@/actions/tiendaBultos";

function bultoADraft(bulto: number | null): string {
  return bulto == null ? "" : String(bulto);
}

function draftABulto(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  return i >= 1 ? i : null;
}

export default function CeldaBultoTienda({
  codTienda,
  bulto,
  puedeEditar,
}: {
  codTienda: string;
  bulto: number | null;
  puedeEditar: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => bultoADraft(bulto));
  const committedRef = useRef(bulto);
  const [isPending, startTransition] = useTransition();

  function persist(nextRaw: string) {
    const parsed = draftABulto(nextRaw);
    const actual = committedRef.current;
    if (parsed === actual || (parsed == null && actual == null)) {
      setDraft(bultoADraft(actual));
      return;
    }
    committedRef.current = parsed;
    startTransition(async () => {
      const res = await guardarBultoTiendaAction({
        codTienda,
        bulto: parsed,
      });
      if (!res.ok) {
        toast.error(res.error);
        committedRef.current = bulto;
        setDraft(bultoADraft(bulto));
        return;
      }
      committedRef.current = res.data.bulto;
      setDraft(bultoADraft(res.data.bulto));
      router.refresh();
    });
  }

  return (
    <EnteroStepperInput
      value={draft}
      onChange={setDraft}
      onCommit={persist}
      min={1}
      allowEmpty
      disabled={!puedeEditar || isPending}
      ariaLabel={`Bulto ${codTienda}`}
    />
  );
}
