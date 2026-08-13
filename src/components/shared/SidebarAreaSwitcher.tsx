"use client";

import { useEffect, useState, useTransition } from "react";
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
import {
  SUCURSALES_PREFERIDAS,
  guardarSucursalPreferida,
  leerSucursalPreferida,
  sucursalPreferidaAbrev,
  type SucursalPreferida,
} from "@/lib/sucursalPreferida";
import type { Rol } from "@/lib/permisos";
import { cn } from "@/lib/utils";

interface Props {
  /** Rol de sesión (`editor` = ya desbloqueó Administración en esta sesión). */
  rolActual: Rol;
}

/** Sesión de navegador: el usuario ya eligió sucursal y módulo al menos una vez. */
const STORAGE_AREA_ELEGIDA = "main-app-area-elegida";

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

const sucursalOptionVariants = cva(
  "flex-1 rounded-lg border px-3 py-2.5 text-center text-sm font-semibold tracking-wide transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
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

function marcarAreaElegida(): void {
  try {
    sessionStorage.setItem(STORAGE_AREA_ELEGIDA, "1");
  } catch {
    /* ignore */
  }
}

function yaEligioArea(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_AREA_ELEGIDA) === "1";
  } catch {
    return false;
  }
}

function yaCompletoOnboarding(): boolean {
  return yaEligioArea() && leerSucursalPreferida() !== null;
}

/**
 * Botón inferior de la slidenav: sucursal preferida + módulo/área.
 * Primera apertura: obliga a elegir **Sucursal** y **Módulo**.
 */
export default function SidebarAreaSwitcher({ rolActual }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [areasOpen, setAreasOpen] = useState(false);
  const [forceChoose, setForceChoose] = useState(false);
  const [sucursalDraft, setSucursalDraft] = useState<SucursalPreferida | null>(
    null
  );
  const [sucursalGuardada, setSucursalGuardada] =
    useState<SucursalPreferida | null>(null);
  const [claveOpen, setClaveOpen] = useState(false);
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState("");
  const [pendingAreaId, setPendingAreaId] = useState<MainAppAreaId | null>(null);
  const [pending, startTransition] = useTransition();

  const currentId = getMainAppAreaIdFromPathname(pathname);
  const current = getMainAppAreaById(currentId);
  const labelModulo = areaLabelMayusculas(current.label);
  const sucursalMostrada = sucursalGuardada ?? sucursalDraft;
  const labelSucursalAbrev = sucursalMostrada
    ? sucursalPreferidaAbrev(sucursalMostrada)
    : "SUC";
  const labelBoton = `${labelSucursalAbrev} / ${forceChoose ? "MÓDULO" : labelModulo}`;

  useEffect(() => {
    const sucursal = leerSucursalPreferida();
    queueMicrotask(() => {
      setSucursalGuardada(sucursal);
      setSucursalDraft(sucursal);
      if (!yaCompletoOnboarding()) {
        setForceChoose(true);
        setAreasOpen(true);
      }
    });
  }, []);

  function persistirOnboarding(sucursal: SucursalPreferida) {
    guardarSucursalPreferida(sucursal);
    marcarAreaElegida();
    setSucursalGuardada(sucursal);
    setForceChoose(false);
  }

  function goToArea(id: MainAppAreaId, sucursal: SucursalPreferida) {
    const area = getMainAppAreaById(id);
    persistirOnboarding(sucursal);
    router.push(area.href);
    setAreasOpen(false);
    setClaveOpen(false);
    setPendingAreaId(null);
  }

  function handleSelectArea(id: MainAppAreaId) {
    if (!sucursalDraft) return;
    if (id === currentId && !forceChoose) {
      persistirOnboarding(sucursalDraft);
      setAreasOpen(false);
      return;
    }
    if (id === currentId && forceChoose) {
      persistirOnboarding(sucursalDraft);
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
      goToArea(id, sucursalDraft);
    });
  }

  function handleActivarYNavegar() {
    if (!pendingAreaId || !sucursalDraft) return;
    setError("");
    startTransition(async () => {
      const res = await activarModoEditor(clave);
      if (!res.ok) {
        setError(res.error ?? "Error desconocido.");
        return;
      }
      goToArea(pendingAreaId, sucursalDraft);
      router.refresh();
    });
  }

  function handleAreasOpenChange(open: boolean) {
    if (!open && forceChoose) {
      setAreasOpen(true);
      return;
    }
    if (open) {
      setSucursalDraft(leerSucursalPreferida() ?? sucursalGuardada);
    }
    setAreasOpen(open);
  }

  const puedeConfirmarModulo = sucursalDraft !== null;

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
        aria-label="Cambiar Sucursal Y Módulo De La Aplicación"
      >
        <LayoutGrid className="h-4 w-4 shrink-0" aria-hidden />
        <span className="relative flex min-w-0 items-center justify-center">
          <span className="invisible whitespace-nowrap text-sm font-semibold tracking-wide">
            CAMBIAR SUC / MÓDULO
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-wide transition-opacity duration-150 opacity-100 group-hover:opacity-0">
            {forceChoose ? "SUC / MÓDULO" : labelBoton}
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-wide transition-opacity duration-150 opacity-0 group-hover:opacity-100">
            CAMBIAR SUC / MÓDULO
          </span>
        </span>
      </button>

      <Dialog open={areasOpen} onOpenChange={handleAreasOpenChange}>
        <AppModal
          size="sm"
          title="Sucursal Y Módulo"
          padding="sm"
          showCloseButton={!forceChoose}
          actions={
            forceChoose ? (
              <p className="w-full text-center text-xs text-muted-foreground">
                Elegí sucursal y módulo para empezar a navegar.
              </p>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setAreasOpen(false)}>
                Cerrar
              </Button>
            )
          }
        >
          <div className="flex w-full min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">Sucursal</p>
              <div className="flex gap-2">
                {SUCURSALES_PREFERIDAS.map((s) => {
                  const esActual = sucursalDraft === s.value;
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setSucursalDraft(s.value)}
                      disabled={pending}
                      className={cn(sucursalOptionVariants({ current: esActual }))}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-foreground">Módulo</p>
              {!puedeConfirmarModulo ? (
                <p className="text-xs text-muted-foreground">
                  Primero seleccioná una sucursal.
                </p>
              ) : null}
              {MAIN_APP_AREAS.map((area) => {
                const Icon = areaIcons[area.id];
                const esActual = area.id === currentId && !forceChoose;
                return (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => handleSelectArea(area.id)}
                    disabled={pending || !puedeConfirmarModulo}
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
          </div>
        </AppModal>
      </Dialog>

      <Dialog
        open={claveOpen}
        onOpenChange={(open) => {
          setClaveOpen(open);
          if (!open) {
            setPendingAreaId(null);
            if (forceChoose || !yaCompletoOnboarding()) {
              setAreasOpen(true);
            }
          }
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
                  if (forceChoose || !yaCompletoOnboarding()) {
                    setAreasOpen(true);
                  }
                }}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleActivarYNavegar}
                disabled={pending || !clave || !pendingAreaId || !sucursalDraft}
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
