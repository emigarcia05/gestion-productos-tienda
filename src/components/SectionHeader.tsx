import { Separator } from "@/components/ui/separator";

interface Props {
  titulo: string;
  /** Nombre del submódulo actual (menor jerarquía, debajo del título) */
  subtitulo?: string;
  /** Botones de acción a la derecha; tamaño uniforme obligatorio (h-10 px-4) */
  actions?: React.ReactNode;
}

export default function SectionHeader({ titulo, subtitulo, actions }: Props) {
  return (
    <header className="shrink-0 w-full bg-white/80 px-6 pt-5 pb-0">
      <div className="flex flex-nowrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
          <div className="min-w-0">
            <h1 className="text-3xl font-black text-slate-950">{titulo}</h1>
            {subtitulo && (
              <p className="mt-1 text-sm font-medium text-slate-500">{subtitulo}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 [&_button]:!h-10 [&_button]:!px-4 [&_button]:shrink-0">
            {actions}
          </div>
        )}
      </div>
      <Separator className="bg-slate-200/60" />
    </header>
  );
}
