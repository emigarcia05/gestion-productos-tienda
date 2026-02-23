import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Tab {
  label: string;
  href?: string;
  active: boolean;
  icon?: React.ReactNode;
}

interface Props {
  volverHref: string;
  titulo: string;
  subtitulo?: string;
  /** Elementos que van en la fila 1, entre el título y el logo (ej: info de sync) */
  acciones?: React.ReactNode;
  /** Botones que van a la derecha de la barra de navegación (fila 2) */
  accionesBarra?: React.ReactNode;
  tabs?: Tab[];
}

export default function PageHeader({ volverHref, titulo, subtitulo, acciones, accionesBarra, tabs }: Props) {
  return (
    <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-0">

      {/* Fila 0: Volver (discreta, arriba del todo) */}
      <div className="flex items-center justify-between mb-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-accent2 hover:text-accent2/80 hover:bg-accent2/10">
          <Link href={volverHref}>
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>

        {/* Acciones opcionales (ej: info sync) */}
        {acciones && (
          <div className="flex items-center gap-2">
            {acciones}
          </div>
        )}

        {/* Logo */}
        <div className="shrink-0">
          <Image
            src="/logo_tiendacolor_png.png"
            alt="TiendaColor"
            height={40}
            width={130}
            className="h-10 w-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* Fila 1: Título centrado con presencia */}
      <div className="flex flex-col items-center gap-1 pb-4">
        <h1 className="text-3xl font-black tracking-widest uppercase text-brand leading-none">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="text-xs text-muted-foreground">{subtitulo}</p>
        )}
        {/* Línea decorativa */}
        <div className="mt-2 h-0.5 w-16 rounded-full bg-brand/60" />
      </div>

      {/* Fila 2: Sub-navegación + botones a la derecha */}
      <div className="flex items-center justify-between border-b border-border/50">
        <div className="flex gap-1">
          {tabs ? (
            tabs.map((tab) =>
              tab.active ? (
                <span
                  key={tab.label}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-accent2 text-accent2 -mb-px"
                >
                  {tab.icon}
                  {tab.label}
                </span>
              ) : tab.href ? (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors -mb-px"
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              ) : null
            )
          ) : (
            <span className="px-4 py-2 text-sm font-medium border-b-2 border-accent2 text-accent2 -mb-px">
              {titulo}
            </span>
          )}
        </div>

        {/* Botones a la derecha de la barra */}
        {accionesBarra && (
          <div className="flex items-center gap-2 pb-1">
            {accionesBarra}
          </div>
        )}
      </div>

    </div>
  );
}
