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

      {/* 1er div: Volver | Título + info extra | Logo */}
      <div className="flex items-center justify-between gap-4 pb-3">

        {/* Izquierda: botón Inicio */}
        <div className="flex items-center">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-accent2 hover:text-accent2/80 hover:bg-accent2/10">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Inicio
            </Link>
          </Button>
        </div>

        {/* Centro: título + subtítulo + info extra (sync info, etc.) */}
        <div className="flex flex-col items-center gap-0.5">
          <h1 className="text-3xl font-black tracking-widest uppercase text-brand leading-none">
            {titulo}
          </h1>
          {subtitulo && (
            <p className="text-xs text-muted-foreground">{subtitulo}</p>
          )}
          {acciones && (
            <div className="mt-1 flex items-center gap-2">{acciones}</div>
          )}
        </div>

        {/* Derecha: logo */}
        <div className="flex items-center shrink-0">
          <Image
            src="/logo_tiendacolor_png.png"
            alt="TiendaColor"
            height={70}
            width={130}
            className="h-16 w-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* 2do div: tabs de nav + botón de acción — con líneas amarillas arriba y abajo */}
      <div className="border-y py-2 flex items-center justify-between" style={{ borderColor: "rgba(255,193,7,0.6)" }}>
        <div className="flex gap-2">
          {tabs ? (
            tabs.map((tab) =>
              tab.active ? (
                <span
                  key={tab.label}
                  className="inline-flex items-center justify-center gap-1.5 w-44 h-9 px-3 text-sm font-semibold rounded-md border text-white leading-none"
                  style={{ borderColor: "#0072BB", backgroundColor: "#0072BB" }}
                >
                  {tab.icon}
                  {tab.label}
                </span>
              ) : tab.href ? (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className="inline-flex items-center justify-center gap-1.5 w-44 h-9 px-3 text-sm font-medium rounded-md border transition-colors hover:opacity-80 leading-none"
                  style={{ borderColor: "#0072BB", color: "#0072BB" }}
                >
                  {tab.icon}
                  {tab.label}
                </Link>
              ) : null
            )
          ) : null}
        </div>

        {accionesBarra && (
          <div className="flex items-center gap-2">{accionesBarra}</div>
        )}
      </div>

    </div>
  );
}
