"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, User, LogOut, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activarModoEditor, volverModoSimple } from "@/actions/sesion";
import type { Rol } from "@/lib/permisos";
import AppModal from "@/components/shared/AppModal";

interface Props {
  rolActual: Rol;
  /** En true, solo muestra el enlace para cambiar rol + modal (para Sidebar User Card) */
  compact?: boolean;
}

export default function SelectorRol({ rolActual, compact = false }: Props) {
  const router = useRouter();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [clave, setClave] = useState("");
  const [mostrarClave, setMostrarClave] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleAbrirModal() {
    setClave("");
    setError("");
    setMostrarClave(false);
    setModalAbierto(true);
  }

  function handleActivar() {
    setError("");
    startTransition(async () => {
      const res = await activarModoEditor(clave);
      if (res.ok) {
        setModalAbierto(false);
        router.refresh();
      } else {
        setError(res.error ?? "Error desconocido.");
      }
    });
  }

  function handleVolver() {
    startTransition(async () => {
      await volverModoSimple();
      router.refresh();
    });
  }

  const switcherClass = "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors";

  const switcher =
    rolActual === "editor" ? (
      <button
        type="button"
        onClick={handleVolver}
        disabled={pending}
        className={switcherClass}
      >
        <LogOut className="h-3 w-3" />
        Salir
      </button>
    ) : (
      <button
        type="button"
        onClick={handleAbrirModal}
        className={switcherClass}
      >
        <ShieldCheck className="h-3 w-3" />
        Cambiar a Editor
      </button>
    );

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => {
            if (rolActual === "simple") handleAbrirModal();
            else handleVolver();
          }}
          disabled={pending}
          className={cn(
            "w-full rounded-lg px-3 py-2",
            "flex items-center justify-center gap-2",
            "group",
            "sidebar-user-switcher-surface",
            "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            pending && "cursor-not-allowed opacity-90"
          )}
          aria-label={
            rolActual === "simple"
              ? "Cambiar A Modo Editor"
              : "Volver A Modo Vendedor"
          }
        >
          <User className="h-4 w-4 shrink-0" aria-hidden />
          <span className="relative flex items-center justify-center">
            <span className="invisible whitespace-nowrap text-sm font-semibold tracking-wide">
              CAMBIAR USUARIO
            </span>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-wide transition-opacity duration-150 opacity-100 group-hover:opacity-0">
              {rolActual === "editor" ? "EDITOR" : "VENDEDOR"}
            </span>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-wide transition-opacity duration-150 opacity-0 group-hover:opacity-100">
              CAMBIAR USUARIO
            </span>
          </span>
        </button>

        {rolActual === "simple" && (
          <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
            <AppModal
              size="sm"
              title={
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-accent2" />
                  <span>Acceso De Editor</span>
                </div>
              }
              actions={
                <>
                  <Button variant="ghost" onClick={() => setModalAbierto(false)} disabled={pending}>
                    Cancelar
                  </Button>
                  <Button onClick={handleActivar} disabled={pending || !clave}>
                    {pending ? "Verificando..." : "Activar Modo Editor"}
                  </Button>
                </>
              }
            >
              <div className="space-y-4">
                <p className="text-sm text-foreground">
                  Ingresá la clave para activar el modo de edición.
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="clave-editor">CLAVE</Label>
                  <div className="relative">
                    <Input
                      id="clave-editor"
                      type={mostrarClave ? "text" : "password"}
                      value={clave}
                      onChange={(e) => {
                        setClave(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleActivar();
                      }}
                      placeholder="INGRESAR CLAVE"
                      autoFocus
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarClave((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      aria-label={mostrarClave ? "Ocultar Clave" : "Mostrar Clave"}
                    >
                      {mostrarClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              </div>
            </AppModal>
          </Dialog>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/80 px-4 py-2.5 shadow-sm">
        <User className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium text-foreground">
          {rolActual === "editor" ? "Modo Editor" : "Modo Vendedor"}
        </span>
        <span className="text-muted-foreground text-xs mx-1">·</span>
        {switcher}
      </div>

      {/* Modal de clave */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <AppModal
          size="sm"
          title={
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent2" />
              <span>Acceso De Editor</span>
            </div>
          }
          actions={
            <>
              <Button variant="ghost" onClick={() => setModalAbierto(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button onClick={handleActivar} disabled={pending || !clave}>
                {pending ? "Verificando..." : "Activar Modo Editor"}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Ingresá la clave para activar el modo de edición.
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="clave-editor">CLAVE</Label>
              <div className="relative">
                <Input
                  id="clave-editor"
                  type={mostrarClave ? "text" : "password"}
                  value={clave}
                  onChange={(e) => {
                    setClave(e.target.value);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleActivar();
                  }}
                  placeholder="INGRESAR CLAVE"
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={mostrarClave ? "Ocultar Clave" : "Mostrar Clave"}
                >
                  {mostrarClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          </div>
        </AppModal>
      </Dialog>
    </>
  );
}
