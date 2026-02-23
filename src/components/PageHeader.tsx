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
  acciones?: React.ReactNode;
  tabs?: Tab[];
}

export default function PageHeader({ volverHref, titulo, subtitulo, acciones, tabs }: Props) {
  return (
    <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-0 space-y-3">
      {/* Fila 1: Volver + Título + Acciones + Logo */}
      <div className="flex items-center justify-between gap-4">
        {/* Izquierda: Volver + Título */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-accent2 hover:text-accent2/80 hover:bg-accent2/10">
            <Link href={volverHref}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight uppercase text-brand">
              {titulo}
            </h1>
            {subtitulo && (
              <p className="text-xs text-muted-foreground">{subtitulo}</p>
            )}
          </div>
        </div>

        {/* Centro/Derecha: acciones */}
        {acciones && (
          <div className="flex items-center gap-2 shrink-0">
            {acciones}
          </div>
        )}

        {/* Logo — margen superior derecho, ocupa el alto de fila 1 + fila 2 */}
        <div className="shrink-0 flex items-center self-stretch">
          <Image
            src="/logo-tiendacolor.png"
            alt="TiendaColor"
            height={56}
            width={160}
            className="h-full w-auto object-contain"
            priority
          />
        </div>
      </div>

      {/* Fila 2: Sub-navegación */}
      <div className="flex gap-1 border-b border-border/50">
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
    </div>
  );
}
