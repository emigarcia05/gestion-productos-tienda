"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import AppModal from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { toast } from "sonner";
import {
  createCompetenciaAction,
  deleteCompetenciaAction,
  listCompetenciasAction,
  updateCompetenciaAction,
} from "@/actions/competenciaPrecios";
import type { CompetenciaParaCliente } from "@/services/competencia.service";
import { labelUltimaComparacionCompetencia } from "@/lib/competenciaUltimaComparacion";
import type { CompetenciaConfigExtraccion } from "@/lib/competenciaConfigExtraccion";
import CompetenciaExtraccionReglasEditor from "@/components/precios-competencia/CompetenciaExtraccionReglasEditor";
import {
  TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS,
  TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS,
} from "@/lib/ui-classes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

const CONFIG_VACIA: CompetenciaConfigExtraccion = { reglaDefaultId: "", reglas: [] };

export default function GestionCompetidoresModal({ open, onOpenChange, onChanged }: Props) {
  const [lista, setLista] = useState<CompetenciaParaCliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [web, setWeb] = useState("");
  const [configExtraccion, setConfigExtraccion] = useState<CompetenciaConfigExtraccion>(CONFIG_VACIA);
  const [editId, setEditId] = useState<string | null>(null);

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
    if (open) void cargar();
  }, [open, cargar]);

  const resetForm = () => {
    setNombre("");
    setWeb("");
    setConfigExtraccion(CONFIG_VACIA);
    setEditId(null);
  };

  const handleGuardar = async () => {
    const payload = {
      nombre: nombre.trim(),
      web: web.trim(),
      configExtraccion,
      ...(editId ? { id: editId } : {}),
    };
    const result = editId
      ? await updateCompetenciaAction(payload)
      : await createCompetenciaAction(payload);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(editId ? "Competidor actualizado." : "Competidor creado.");
    resetForm();
    await cargar();
    onChanged();
  };

  const handleEditar = (row: CompetenciaParaCliente) => {
    setEditId(row.id);
    setNombre(row.nombre);
    setWeb(row.web);
    setConfigExtraccion(row.configExtraccion ?? CONFIG_VACIA);
  };

  const handleEliminar = async (id: string) => {
    const result = await deleteCompetenciaAction({ id });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Competidor eliminado.");
    if (editId === id) resetForm();
    await cargar();
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        size="xl"
        title={editId ? "Editar Competidor" : "Gestionar Competidores"}
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <ModalMicroLabel>Nombre</ModalMicroLabel>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del competidor"
                className="mt-1"
              />
            </div>
            <div>
              <ModalMicroLabel>Sitio Web</ModalMicroLabel>
              <Input
                value={web}
                onChange={(e) => setWeb(e.target.value)}
                placeholder="https://ejemplo.com"
                className="mt-1"
              />
            </div>

            <CompetenciaExtraccionReglasEditor
              value={configExtraccion}
              onChange={setConfigExtraccion}
            />

            <div className="flex gap-2 justify-end">
              {editId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar Edición
                </Button>
              )}
              <Button type="button" variant="default" onClick={() => void handleGuardar()}>
                <Plus className="h-4 w-4 mr-1" />
                {editId ? "Guardar Cambios" : "Agregar Competidor"}
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <Label className="text-sm font-semibold text-foreground">Competidores Registrados</Label>
            {loading ? (
              <p className="text-sm text-muted-foreground mt-2">Cargando...</p>
            ) : lista.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">No hay competidores registrados.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {lista.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{row.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate">{row.web}</p>
                      <p className="text-xs text-muted-foreground">
                        {labelUltimaComparacionCompetencia(row.ultimaComparacionAt)}
                        {row.configExtraccion?.reglas?.length
                          ? ` · ${row.configExtraccion.reglas.length} regla(s) de extracción`
                          : " · sin reglas de extracción"}
                      </p>
                    </div>
                    <div className={TABLE_ROW_CELL_ICON_ACTIONS_FLEX_CLASS}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                        aria-label={`Editar ${row.nombre}`}
                        onClick={() => handleEditar(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={TABLE_ROW_ICON_BUTTON_FILLED_BRAND_CLASS}
                        aria-label={`Eliminar ${row.nombre}`}
                        onClick={() => void handleEliminar(row.id)}
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
  );
}
