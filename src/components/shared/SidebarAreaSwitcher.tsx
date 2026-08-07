"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  Eye,
  EyeOff,
  Landmark,
  LayoutGrid,
  Megaphone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { cva } from "class-variance-authority";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppModal from "@/components/shared/AppModal";
import { activarModoEditor } from "@/actions/sesion";
import {
  MAIN_APP_AREAS,
  areaLabelMayusculas,
  getMainAppAreaById,
  getMainAppAreaIdFromPathname,
  type MainAppAreaId,
} from "@/lib/main-app-areas";
import type { Rol } from "@/lib/permisos";
import { cn } from "@/lib/utils";

interface Props {
  /** Rol de sesión (`editor` = ya desbloqueó Administración en esta sesión). */
  rolActual: Rol;
}

const areaOptionVariants = cva(
  "w-full rounded-lg border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
  {
    variants: {
      current: {
        true: "border-sidebar-indicator bg-sidebar-accent/40 text-sidebar-foreground",
        false: "border-border bg-card text-foreground hover:bg-muted/80",
      },
    },
    defaultVariants: {
      current: false,
    },
  }
);

const areaIcons: Record<MainAppAreaId, LucideIcon> = {
  "gestion-productos": Boxes,
  finanzas: Landmark,
  marketing: Megaphone,
};

/**
 * Botón inferior de la slidenav: navega entre módulos/áreas (Vendedor, Administración, Marketing).
 * Administración pide clave (`EDITOR_PASSWORD`) si la sesión aún es `simple`.
 */
export default function SidebarAreaSwitcher({ rolActual }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [areasOpen, setAreasOpen] = useState(false);
  const [claveOpen, setClaveOpen] = useState(false);
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState("");
  const [pendingAreaId, setPendingAreaId] = useState<MainAppAreaId | null>(null);
  const [pending, startTransition] = useTransition();

  const currentId = getMainAppAreaIdFromPathname(pathname);
  const current = getMainAppAreaById(currentId);
  const labelActual = areaLabelMayusculas(current.label);

  function goToArea(id: MainAppAreaId) {
    const area = getMainAppAreaById(id);
    router.push(area.href);
    setAreasOpen(false);
    setClaveOpen(false);
    setPendingAreaId(null);
  }

  function handleSelectArea(id: MainAppAreaId) {
    if (id === currentId) {
      setAreasOpen(false);
      return;
    }
    const area = getMainAppAreaById(id);
    if (area.requierePassword && rolActual !== "editor") {
      setPendingAreaId(id);
      setAreasOpen(false);
      setClave("");
      setError("");
      setMostrarClave(false);
      setClaveOpen(true);
      return;
    }
    startTransition(() => {
      goToArea(id);
    });
  }

  function handleActivarYNavegar() {
    if (!pendingAreaId) return;
    setError("");
    startTransition(async () => {
      const res = await activarModoEditor(clave);
      if (!res.ok) {
        setError(res.error ?? "Error desconocido.");
        return;
      }
      goToArea(pendingAreaId);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAreasOpen(true)}
        disabled={pending}
        className={cn(
          "w-full rounded-lg px-3 py-2",
          "flex items-center justify-center gap-2",
          "group",
          "sidebar-user-switcher-surface",
          "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          pending && "cursor-not-allowed opacity-90"
        )}
        aria-label="Cambiar Módulo De La Aplicación"
      >
        <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
        <span className="relative flex items-center justify-center">
          <span className="invisible whitespace-nowrap text-sm font-semibold tracking-wide">
            CAMBIAR MÓDULO
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-wide transition-opacity duration-150 opacity-100 group-hover:opacity-0">
            {labelActual}
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-wide transition-opacity duration-150 opacity-0 group-hover:opacity-100">
            CAMBIAR MÓDULO
          </span>
        </span>
      </button>

      <Dialog open={areasOpen} onOpenChange={setAreasOpen}>
        <AppModal
          size="sm"
          title="Módulos De La Aplicación"
          padding="sm"
          actions={
            <Button type="button" variant="ghost" onClick={() => setAreasOpen(false)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex w-full min-w-0 flex-col gap-2">
            {MAIN_APP_AREAS.map((area) => {
              const Icon = areaIcons[area.id];
              const esActual = area.id === currentId;
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleSelectArea(area.id)}
                  disabled={pending}
                  className={cn(areaOptionVariants({ current: esActual }))}
                >
                  <span className="flex items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        esActual ? "text-foreground" : "text-muted-foreground"
                      )}
                      aria-hidden
                    />
                    <span className="block text-sm font-semibold leading-tight text-foreground">
                      {areaLabelMayusculas(area.label)}
                    </span>
                    {area.requierePassword ? (
                      <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Con clave
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </AppModal>
      </Dialog>

      <Dialog
        open={claveOpen}
        onOpenChange={(open) => {
          setClaveOpen(open);
          if (!open) setPendingAreaId(null);
        }}
      >
        <AppModal
          size="sm"
          title={
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent2" />
              <span>Acceso A Administración</span>
            </div>
          }
          actions={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setClaveOpen(false);
                  setPendingAreaId(null);
                }}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleActivarYNavegar}
                disabled={pending || !clave || !pendingAreaId}
              >
                {pending ? "Verificando..." : "Ingresar"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Ingresá la clave para entrar al módulo Administración.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="clave-area-admin">CLAVE</Label>
              <div className="relative">
                <Input
                  id="clave-area-admin"
                  type={mostrarClave ? "text" : "password"}
                  value={clave}
                  onChange={(e) => {
                    setClave(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleActivarYNavegar();
                  }}
                  placeholder="INGRESAR CLAVE"
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  tabIndex={-1}
                  aria-label={mostrarClave ? "Ocultar Clave" : "Mostrar Clave"}
                >
                  {mostrarClave ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
          </div>
        </AppModal>
      </Dialog>
    </>
  );
}
