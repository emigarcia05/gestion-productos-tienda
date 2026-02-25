import { Separator } from "@/components/ui/separator";

interface Props {
  titulo: string;
  descripcion?: string;
  /** Acciones principales a la derecha del título (ej. Crear, Importar) */
  actions?: React.ReactNode;
  /** Línea de submódulos (Nivel 2) debajo del título: Toolbar con Pill Tabs */
  submoduleToolbar?: React.ReactNode;
}

export default function SectionHeader({ titulo, descripcion, actions, submoduleToolbar }: Props) {
  return (
    <header className="shrink-0 w-full bg-white/80 px-6 pt-5 pb-0">
      {/* Fila 1: Título + descripción (módulo nivel 1) */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <div
            className="mt-1 h-10 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: "#0072BB" }}
            aria-hidden
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-black text-slate-950">{titulo}</h1>
            {descripcion && (
              <p className="mt-1 text-sm text-slate-700">{descripcion}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </div>
      {/* Fila 2: Toolbar de submódulos (Nivel 2) */}
      {submoduleToolbar && (
        <nav className="mt-4 flex flex-wrap items-center gap-4" aria-label="Submódulos">
          {submoduleToolbar}
        </nav>
      )}
      <Separator className="mt-4 bg-slate-200/60" />
    </header>
  );
}
