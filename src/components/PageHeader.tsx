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
  const tabActivo = tabs?.find((t) => t.active);
  const tabsInactivos = tabs?.filter((t) => !t.active && t.href);

  return (
    <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-0">

      {/* Fila principal: Volver | Título + span activo | Logo */}
      <div className="flex items-stretch justify-between gap-4 mb-0">

        {/* Izquierda: botón Volver */}
        <div className="flex items-start pt-1">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-accent2 hover:text-accent2/80 hover:bg-accent2/10">
            <Link href={volverHref}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>

        {/* Centro: título + span del tab activo */}
        <div className="flex flex-col items-center gap-1 pb-2">
          <h1 className="text-3xl font-black tracking-widest uppercase text-brand leading-none">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-xs text-muted-foreground">{subtitulo}</p>
          )}
          {tabActivo && (
            <span className="mt-1 text-sm font-medium text-accent2">
              {tabActivo.icon && <span className="inline-flex items-center gap-1">{tabActivo.icon}</span>}
              {tabActivo.label}
            </span>
          )}
          {/* Línea decorativa */}
          <div className="mt-2 h-0.5 w-16 rounded-full bg-brand/60" />
        </div>

        {/* Derecha: logo con altura igual al bloque de título + span */}
        <div className="flex items-center shrink-0">
          <Image
            src="/logo_tiendacolor_png.png"
            alt="TiendaColor"
            height={70}
            width={130}
            className="h-full max-h-20 w-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* Barra inferior: tabs inactivos + acciones + info sync */}
      <div className="flex items-center justify-between border-b border-border/50">
        <div className="flex gap-1">
          {tabsInactivos && tabsInactivos.length > 0 ? (
            tabsInactivos.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href!}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors -mb-px"
              >
                {tab.icon}
                {tab.label}
              </Link>
            ))
          ) : (
            <div className="py-2" />
          )}
        </div>

        <div className="flex items-center gap-3 pb-1">
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
          {accionesBarra && <div className="flex items-center gap-2">{accionesBarra}</div>}
        </div>
      </div>

    </div>
  );
}
