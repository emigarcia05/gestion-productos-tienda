"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, User, LogOut, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activarModoEditor, volverModoSimple } from "@/actions/sesion";
import type { Rol } from "@/lib/permisos";

interface Props {
  rolActual: Rol;
}

export default function SelectorRol({ rolActual }: Props) {
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
      } else {
        setError(res.error ?? "Error desconocido.");
      }
    });
  }

  function handleVolver() {
    startTransition(async () => {
      await volverModoSimple();
    });
  }

  return (
    <>
      {/* Indicador de rol actual */}
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/80 px-4 py-2.5 shadow-sm">
        {rolActual === "editor" ? (
          <>
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="text-sm font-medium">Modo Editor</span>
            <span className="text-muted-foreground text-xs mx-1">·</span>
            <button
              onClick={handleVolver}
              disabled={pending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Salir
            </button>
          </>
        ) : (
          <>
            <User className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">Modo Simple</span>
            <span className="text-muted-foreground text-xs mx-1">·</span>
            <button
              onClick={handleAbrirModal}
              className="flex items-center gap-1 text-xs text-primary hover:underline transition-colors"
            >
              <ShieldCheck className="h-3 w-3" />
              Cambiar a Editor
            </button>
          </>
        )}
      </div>

      {/* Modal de clave */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Acceso de Editor
            </DialogTitle>
            <DialogDescription>
              Ingresá la clave para activar el modo de edición.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="clave-editor">Clave</Label>
              <div className="relative">
                <Input
                  id="clave-editor"
                  type={mostrarClave ? "text" : "password"}
                  value={clave}
                  onChange={(e) => { setClave(e.target.value); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleActivar(); }}
                  placeholder="••••••••"
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarClave((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {mostrarClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setModalAbierto(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button onClick={handleActivar} disabled={pending || !clave}>
                {pending ? "Verificando..." : "Activar modo Editor"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
