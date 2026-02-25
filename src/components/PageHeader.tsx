import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import NavCentroMini from "@/components/NavCentroMini";

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
  /** Mostrar enlace a Tienda en la barra central (miniatura). Por defecto false. */
  mostrarTienda?: boolean;
  /** Mostrar enlace a Stock en la barra central (miniatura). Por defecto false. */
  mostrarStock?: boolean;
  /** Elementos que van debajo de los mini botones (ej: info de sync) */
  acciones?: React.ReactNode;
  /** Botones que van a la derecha de la fila de sub-módulos (ej: Importar, Sync) */
  accionesBarra?: React.ReactNode;
  tabs?: Tab[];
}

/** Ancho y alto fijos para todos los botones de sub-módulo (mismo tamaño) */
const SUBMODULO_BTN = "w-52 h-12 flex items-center justify-center gap-2 rounded-lg text-sm font-medium text-center";

export default function PageHeader({ volverHref, titulo, subtitulo, mostrarTienda, mostrarStock, acciones, accionesBarra, tabs }: Props) {
  return (
    <div className="shrink-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-0">

      {/* 1er div: mini botones de los módulos (Inicio | NavCentroMini | Logo) */}
      <div className="flex items-center justify-between gap-4 pb-3">
        <div className="flex items-center shrink-0">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-accent2 hover:text-accent2/80 hover:bg-accent2/10">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Inicio
            </Link>
          </Button>
        </div>

        <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <h1 className="sr-only">{titulo}</h1>
          <NavCentroMini mostrarTienda={mostrarTienda} mostrarStock={mostrarStock} />
          {subtitulo && (
            <p className="text-xs text-muted-foreground">{subtitulo}</p>
          )}
          {acciones && (
            <div className="flex items-center gap-2">{acciones}</div>
          )}
        </div>

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

      {/* 2do div: sub-módulos — formato rectangular, mismo tamaño, texto + icono centrados */}
      <div
        className="border-y py-3 flex items-center gap-4 flex-wrap"
        style={{ borderColor: "rgba(255,193,7,0.6)" }}
      >
        <div className="flex-1 min-w-0 flex justify-center">
          {tabs && tabs.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-3">
              {tabs.map((tab) =>
                tab.active ? (
                  <span
                    key={tab.label}
                    className={`${SUBMODULO_BTN} shrink-0 border border-brand bg-brand text-white`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </span>
                ) : tab.href ? (
                  <Link
                    key={tab.label}
                    href={tab.href}
                    className={`${SUBMODULO_BTN} shrink-0 border border-brand text-brand bg-transparent hover:bg-brand/10 transition-colors`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </Link>
                ) : null
              )}
            </div>
          ) : null}
        </div>

        {accionesBarra && (
          <div className="flex items-center gap-2 shrink-0">
            {accionesBarra}
          </div>
        )}
      </div>
    </div>
  );
}
