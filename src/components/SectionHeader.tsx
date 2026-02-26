import { Separator } from "@/components/ui/separator";

interface Props {
  titulo: string;
  /** Acciones a la derecha del título (Exportar, Crear, Importar, Sincronizar, etc.) */
  actions?: React.ReactNode;
}

export default function SectionHeader({ titulo, actions }: Props) {
  return (
    <header className="shrink-0 w-full bg-white/80 px-6 pt-5 pb-0">
      <div className="flex flex-nowrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
          <h1 className="text-3xl font-black text-slate-950">{titulo}</h1>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      <Separator className="bg-slate-200/60" />
    </header>
  );
}
