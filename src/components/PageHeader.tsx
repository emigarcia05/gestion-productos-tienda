import Link from "next/link";
import { Home } from "lucide-react";
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
  mostrarTienda?: boolean;
  mostrarStock?: boolean;
  tabs?: Tab[];
}

const SUBMODULO_BTN =
  "w-48 h-11 flex items-center justify-center gap-2 rounded-lg text-sm font-medium text-center transition-colors";

export default function PageHeader({ volverHref, titulo, mostrarTienda, mostrarStock, tabs }: Props) {
  return (
    <header className="shrink-0 w-full px-4 py-4 space-y-3">
      <h1 className="sr-only">{titulo}</h1>

      {/* Div 1: solo botones de navegación (Inicio + módulos) */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="flex flex-col items-center justify-center gap-1 min-w-[5.5rem] min-h-[4.5rem] py-2.5 px-2 rounded-lg border-2 border-brand bg-brand text-white text-xs font-medium hover:opacity-90 transition-all shrink-0"
        >
          <Home className="h-5 w-5 shrink-0" />
          <span>Inicio</span>
        </Link>
        <NavCentroMini mostrarTienda={mostrarTienda} mostrarStock={mostrarStock} />
      </div>

      {/* Div 2: solo botones de sub-módulos (si hay) */}
      {tabs && tabs.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {tabs.map((tab) =>
            tab.active ? (
              <span
                key={tab.label}
                className={`${SUBMODULO_BTN} bg-brand text-white border border-brand`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </span>
            ) : tab.href ? (
              <Link
                key={tab.label}
                href={tab.href}
                className={`${SUBMODULO_BTN} border border-border bg-card text-foreground hover:bg-muted hover:border-brand/50`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            ) : null
          )}
        </div>
      )}
    </header>
  );
}
