interface Props {
  titulo: string;
  descripcion?: string;
  actions?: React.ReactNode;
}

export default function SectionHeader({ titulo, descripcion, actions }: Props) {
  return (
    <header className="shrink-0 w-full border-b border-slate-200/60 bg-white/80 px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          {/* Línea vertical de marca */}
          <div
            className="mt-1 h-10 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: "#0072BB" }}
            aria-hidden
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-slate-900">{titulo}</h1>
            {descripcion && (
              <p className="mt-1 text-sm text-slate-500">{descripcion}</p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
