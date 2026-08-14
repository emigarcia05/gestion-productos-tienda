"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  deleteCompetenciaAction,
  listCompetenciasAction,
} from "@/actions/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import { matchByMultiTerm } from "@/lib/busqueda";
import AltaCompetidorModal from "@/components/precios-competencia/AltaCompetidorModal";
import ConfiguracionCompetidorModal from "@/components/precios-competencia/ConfiguracionCompetidorModal";
import { TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS } from "@/lib/ui-classes";
import { cn } from "@/lib/utils";

const LIST_ROW_ICON_BTN_CLASS = cn(
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
  "h-9 w-9 min-h-9 max-h-9"
);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export default function GestionCompetidoresModal({ open, onOpenChange, onChanged }: Props) {
  const [lista, setLista] = useState<CompetenciaParaCliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [altaOpen, setAltaOpen] = useState(false);
  const [configCompetidor, setConfigCompetidor] = useState<CompetenciaParaCliente | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCompetenciasAction();
      setLista(rows);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      setBusqueda("");
      void cargar();
    }
  }, [open, cargar]);

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim();
    if (!q) return lista;
    return lista.filter((c) => matchByMultiTerm([c.nombre, c.web], q));
  }, [lista, busqueda]);

  const handleEliminar = async (row: CompetenciaParaCliente) => {
    const result = await deleteCompetenciaAction({ id: row.id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Competidor eliminado.");
    if (configCompetidor?.id === row.id) setConfigCompetidor(null);
    await cargar();
    onChanged();
  };

  const handleCreado = async (nuevo: CompetenciaParaCliente) => {
    await cargar();
    onChanged();
    setConfigCompetidor(nuevo);
  };

  const handleConfigGuardado = async () => {
    await cargar();
    onChanged();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <AppModal
          size="lg"
          title="Gestionar Competidores"
          actions={
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary pointer-events-none" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="BUSCAR COMPETIDOR POR NOMBRE..."
                  className="pl-9 h-10"
                  aria-label="Buscar competidor por nombre"
                />
              </div>
              <Button
                type="button"
                variant="default"
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label="Agregar competidor"
                onClick={() => setAltaOpen(true)}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            <div className="min-h-[12rem]">
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando...</p>
              ) : lista.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay competidores. Usá el botón + para agregar el primero.
                </p>
              ) : listaFiltrada.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Ningún competidor coincide con la búsqueda.
                </p>
              ) : (
                <ul className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1">
                  {listaFiltrada.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                    >
                      <div className="flex min-w-0 flex-1 items-center justify-start text-left">
                        <p className="w-full truncate text-left font-medium text-foreground">
                          {row.nombre}
                        </p>
                      </div>
                      <div className="ml-auto flex shrink-0 items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={LIST_ROW_ICON_BTN_CLASS}
                          aria-label={`Configurar ${row.nombre}`}
                          onClick={() => setConfigCompetidor(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={LIST_ROW_ICON_BTN_CLASS}
                          aria-label={`Eliminar ${row.nombre}`}
                          onClick={() => void handleEliminar(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </AppModal>
      </Dialog>

      <AltaCompetidorModal
        open={altaOpen}
        onOpenChange={setAltaOpen}
        onCreado={(c) => void handleCreado(c)}
      />

      <ConfiguracionCompetidorModal
        open={!!configCompetidor}
        onOpenChange={(o) => !o && setConfigCompetidor(null)}
        competidor={configCompetidor}
        onGuardado={() => void handleConfigGuardado()}
      />
    </>
  );
}
