"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Landmark,
  Megaphone,
  ShieldCheck,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiltroIndividualContainer } from "@/components/FilterBar";
import AppModal from "@/components/shared/AppModal";
import { activarModoEditor } from "@/actions/sesion";
import { listUsuariosParaInicioSesionAction } from "@/actions/globalPersonal";
import {
  areaLabelMayusculas,
  getMainAppAreaById,
  getMainAppAreaIdFromPathname,
  type MainAppAreaId,
} from "@/lib/main-app-areas";
import type { GlobalPersonalItem } from "@/services/globalPersonal.service";
import {
  guardarUsuarioSesion,
  leerUsuarioSesion,
  usuarioSesionDesdeItem,
  type UsuarioSesion,
} from "@/lib/usuarioSesion";
import {
  puedeCambiarModulo,
  primerModuloPermitido,
  etiquetaSucursalPorDefecto,
  usuarioTieneAdministracion,
} from "@/lib/usuarios";
import { avisarAdvertirTransfPendientes } from "@/lib/indicadorSlidenav";
import type { Rol } from "@/lib/permisos";
import { cn } from "@/lib/utils";

interface Props {
  /** Rol de sesión (`editor` = ya desbloqueó Administración en esta sesión). */
  rolActual: Rol;
}

const ICONO_MODULO: Record<MainAppAreaId, LucideIcon> = {
  "gestion-productos": Store,
  finanzas: Landmark,
  marketing: Megaphone,
};

function nombreUsuarioLabel(nombre: string): string {
  return nombre.toLocaleUpperCase("es-AR");
}

/**
 * Pie de slidenav: ícono de módulo (si puede cambiar) + nombre de usuario.
 * Primera visita: modal **Elegir Usuario**; si el usuario tiene Administración, pide clave.
 */
export default function SidebarAreaSwitcher({ rolActual }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [forceChoose, setForceChoose] = useState(false);
  const [usuarioOpen, setUsuarioOpen] = useState(false);
  const [moduloOpen, setModuloOpen] = useState(false);
  const [claveOpen, setClaveOpen] = useState(false);
  const [usuarios, setUsuarios] = useState<GlobalPersonalItem[]>([]);
  const [usuariosError, setUsuariosError] = useState("");
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [usuarioSesion, setUsuarioSesion] = useState<UsuarioSesion | null>(null);
  const [moduloDraft, setModuloDraft] = useState<MainAppAreaId | "">("");
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState("");
  const [pendingUsuario, setPendingUsuario] = useState<UsuarioSesion | null>(null);
  const [pendingAreaId, setPendingAreaId] = useState<MainAppAreaId | null>(null);
  const [advertirTrasClave, setAdvertirTrasClave] = useState(false);
  const [pending, startTransition] = useTransition();

  const currentId = getMainAppAreaIdFromPathname(pathname);
  const puedeCambiar = usuarioSesion
    ? puedeCambiarModulo(usuarioSesion.modulosPermitidos)
    : false;

  useEffect(() => {
    const guardado = leerUsuarioSesion();
    queueMicrotask(() => {
      setUsuarioSesion(guardado);
      if (!guardado) {
        setForceChoose(true);
        setUsuarioOpen(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!usuarioOpen) return;
    let cancelled = false;
    queueMicrotask(() => {
      setCargandoUsuarios(true);
      setUsuariosError("");
    });
    void listUsuariosParaInicioSesionAction().then((res) => {
      if (cancelled) return;
      setCargandoUsuarios(false);
      if (!res.ok) {
        setUsuarios([]);
        setUsuariosError(res.error);
        return;
      }
      setUsuarios(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [usuarioOpen]);

  function persistirYNavegar(
    usuario: UsuarioSesion,
    areaId: MainAppAreaId,
    advertirTransf: boolean
  ) {
    guardarUsuarioSesion(usuario);
    setUsuarioSesion(usuario);
    setForceChoose(false);
    const area = getMainAppAreaById(areaId);
    router.push(area.href);
    setUsuarioOpen(false);
    setModuloOpen(false);
    setClaveOpen(false);
    setPendingUsuario(null);
    setPendingAreaId(null);
    setAdvertirTrasClave(false);
    if (advertirTransf) {
      window.setTimeout(() => {
        avisarAdvertirTransfPendientes();
      }, 300);
    }
  }

  function pedirClave(
    usuario: UsuarioSesion,
    areaId: MainAppAreaId,
    advertirTransf: boolean
  ) {
    setPendingUsuario(usuario);
    setPendingAreaId(areaId);
    setAdvertirTrasClave(advertirTransf);
    setUsuarioOpen(false);
    setModuloOpen(false);
    setClave("");
    setError("");
    setMostrarClave(false);
    setClaveOpen(true);
  }

  function aplicarUsuario(item: GlobalPersonalItem) {
    const usuario = usuarioSesionDesdeItem(item);
    if (!usuario) return;
    const destino = primerModuloPermitido(usuario.modulosPermitidos);
    if (!destino) return;
    if (usuarioTieneAdministracion(usuario.modulosPermitidos) && rolActual !== "editor") {
      pedirClave(usuario, destino, true);
      return;
    }
    startTransition(() => {
      persistirYNavegar(usuario, destino, true);
    });
  }

  function aplicarModulo(usuario: UsuarioSesion, areaId: MainAppAreaId) {
    if (areaId === currentId && !forceChoose) {
      setModuloOpen(false);
      return;
    }
    const area = getMainAppAreaById(areaId);
    if (area.requierePassword && rolActual !== "editor") {
      pedirClave(usuario, areaId, false);
      return;
    }
    startTransition(() => {
      persistirYNavegar(usuario, areaId, false);
    });
  }

  function handleAplicarModulo() {
    if (!usuarioSesion || moduloDraft === "") return;
    aplicarModulo(usuarioSesion, moduloDraft);
  }

  function handleActivarYNavegar() {
    if (!pendingUsuario || !pendingAreaId) return;
    setError("");
    startTransition(async () => {
      const res = await activarModoEditor(clave);
      if (!res.ok) {
        setError(res.error ?? "Error desconocido.");
        return;
      }
      persistirYNavegar(pendingUsuario, pendingAreaId, advertirTrasClave);
      router.refresh();
    });
  }

  function handleUsuarioOpenChange(open: boolean) {
    if (!open && forceChoose) {
      setUsuarioOpen(true);
      return;
    }
    setUsuarioOpen(open);
  }

  function handleClaveOpenChange(open: boolean) {
    setClaveOpen(open);
    if (!open) {
      setPendingUsuario(null);
      setPendingAreaId(null);
      setAdvertirTrasClave(false);
      if (forceChoose) {
        setUsuarioOpen(true);
      }
    }
  }

  function handleCancelarClave() {
    setClaveOpen(false);
    setPendingUsuario(null);
    setPendingAreaId(null);
    setAdvertirTrasClave(false);
    if (forceChoose) {
      setUsuarioOpen(true);
    }
  }

  const labelUsuario = usuarioSesion
    ? nombreUsuarioLabel(usuarioSesion.nombrePersonal)
    : "USUARIO";

  const IconoModulo = ICONO_MODULO[currentId];

  function abrirCambiarModulo() {
    const actualPermitido = usuarioSesion?.modulosPermitidos.includes(currentId)
      ? currentId
      : primerModuloPermitido(usuarioSesion?.modulosPermitidos ?? []);
    setModuloDraft(actualPermitido ?? "");
    setModuloOpen(true);
  }

  return (
    <>
      <div
        className={cn(
          "w-full rounded-lg px-2 py-2",
          "sidebar-user-switcher-surface"
        )}
      >
        {puedeCambiar ? (
          <button
            type="button"
            onClick={abrirCambiarModulo}
            disabled={pending || forceChoose}
            aria-label="Cambiar Módulo"
            title="Cambiar Módulo"
            className={cn(
              "grid w-full grid-cols-[15%_85%] items-center gap-0",
              "rounded-md text-left",
              "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              pending && "cursor-not-allowed opacity-90"
            )}
          >
            <span className="flex items-center justify-center">
              <IconoModulo className="size-4 shrink-0" aria-hidden />
            </span>
            <span className="min-w-0 truncate text-sm font-semibold tracking-wide">
              {labelUsuario}
            </span>
          </button>
        ) : (
          <p className="w-full truncate text-center text-sm font-semibold tracking-wide">
            {labelUsuario}
          </p>
        )}
      </div>

      <Dialog open={usuarioOpen} onOpenChange={handleUsuarioOpenChange}>
        <AppModal
          size="sm"
          title="Elegir Usuario"
          padding="sm"
          showCloseButton={!forceChoose}
          footerClassName={forceChoose ? "justify-center" : undefined}
          actions={
            forceChoose ? (
              <p className="w-full text-center text-sm text-muted-foreground">
                Tocá un usuario para continuar
              </p>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUsuarioOpen(false)}
                disabled={pending}
              >
                Cerrar
              </Button>
            )
          }
        >
          <div className="flex w-full min-w-0 flex-col gap-2">
            {cargandoUsuarios ? (
              <p className="text-sm text-foreground">Cargando…</p>
            ) : null}
            {usuariosError ? (
              <p className="text-sm text-destructive">{usuariosError}</p>
            ) : null}
            {!cargandoUsuarios && !usuariosError && usuarios.length === 0 ? (
              <p className="text-sm text-foreground">
                No hay usuarios configurados. Cargá sucursal y módulos en Usuarios.
              </p>
            ) : null}
            {!cargandoUsuarios && usuarios.length > 0 ? (
              <div
                className="flex max-h-[min(24rem,50vh)] w-full min-w-0 flex-col gap-2 overflow-y-auto"
                role="list"
                aria-label="Usuarios disponibles"
              >
                {usuarios.map((u) => {
                  const sucursal = etiquetaSucursalPorDefecto(u.sucursalPorDefecto);
                  return (
                    <Button
                      key={u.idPersonal}
                      type="button"
                      variant="outline"
                      role="listitem"
                      disabled={pending}
                      onClick={() => aplicarUsuario(u)}
                      className={cn(
                        "h-auto w-full justify-start px-3 py-2.5 text-left",
                        "whitespace-normal"
                      )}
                    >
                      <span className="flex min-w-0 flex-col items-start gap-0.5">
                        <span className="w-full truncate text-sm font-semibold tracking-wide">
                          {nombreUsuarioLabel(u.nombrePersonal)}
                        </span>
                        {sucursal ? (
                          <span className="text-xs font-medium text-muted-foreground">
                            {sucursal}
                          </span>
                        ) : null}
                      </span>
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </AppModal>
      </Dialog>

      <Dialog open={moduloOpen} onOpenChange={setModuloOpen}>
        <AppModal
          size="sm"
          title="Cambiar Módulo"
          padding="sm"
          actions={
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModuloOpen(false)}
                disabled={pending}
              >
                Cerrar
              </Button>
              <Button
                type="button"
                onClick={handleAplicarModulo}
                disabled={pending || moduloDraft === ""}
              >
                {pending ? "Aplicando..." : "Aplicar"}
              </Button>
            </>
          }
        >
          <FiltroIndividualContainer
            className="w-full"
            activo={moduloDraft !== ""}
            onLimpiar={() => setModuloDraft("")}
          >
            <Select
              value={moduloDraft || undefined}
              onValueChange={(v) => setModuloDraft(v as MainAppAreaId)}
            >
              <SelectTrigger
                id="switcher-modulo"
                className="input-filtro-unificado w-full"
                aria-label="Módulo"
              >
                <SelectValue placeholder="MÓDULO" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                align="start"
                className="select-content-filtro"
              >
                {(usuarioSesion?.modulosPermitidos ?? []).map((id) => {
                  const area = getMainAppAreaById(id);
                  return (
                    <SelectItem key={id} value={id}>
                      {areaLabelMayusculas(area.label)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </FiltroIndividualContainer>
        </AppModal>
      </Dialog>

      <Dialog open={claveOpen} onOpenChange={handleClaveOpenChange}>
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
                onClick={handleCancelarClave}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleActivarYNavegar}
                disabled={pending || !clave || !pendingUsuario || !pendingAreaId}
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
