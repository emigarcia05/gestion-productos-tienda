"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import CatalogoFinderColumn from "@/components/shared/catalogo-finder/CatalogoFinderColumn";
import CatalogoFinderEmpty from "@/components/shared/catalogo-finder/CatalogoFinderEmpty";
import CatalogoFinderRow from "@/components/shared/catalogo-finder/CatalogoFinderRow";
import CrearEditarEnviosDireccionModal from "@/components/envios/CrearEditarEnviosDireccionModal";
import CrearEditarClienteModal from "@/components/envios/CrearEditarClienteModal";
import FiltroBusquedaInput from "@/components/shared/FiltroBusquedaInput";
import AppModal from "@/components/shared/AppModal";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { eliminarClienteAction, eliminarEnviosDireccionAction } from "@/actions/envios";
import { matchByMultiTerm } from "@/lib/busqueda";
import {
  etiquetaDireccionEnvio,
  nombreCompletoCliente,
  type ClienteItem,
  type EnviosDireccionItem,
} from "@/lib/envios";
import { useFiltrosConBusqueda } from "@/lib/hooks/useFiltrosConBusqueda";

interface Props {
  clientesCatalogo: ClienteItem[];
  direcciones: EnviosDireccionItem[];
}

export default function CrearEnvioPageClient({ clientesCatalogo, direcciones }: Props) {
  const router = useRouter();
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [direccionId, setDireccionId] = useState<string | null>(null);
  const [qClienteDebounced, setQClienteDebounced] = useState("");
  const [qDireccionDebounced, setQDireccionDebounced] = useState("");
  const busquedaCliente = useFiltrosConBusqueda({
    qActual: qClienteDebounced,
    debounceMs: 300,
    onDebouncedSearch: setQClienteDebounced,
  });
  const busquedaDireccion = useFiltrosConBusqueda({
    qActual: qDireccionDebounced,
    debounceMs: 300,
    onDebouncedSearch: setQDireccionDebounced,
  });
  const [modalCliente, setModalCliente] = useState<
    { open: false } | { open: true; modo: "crear" | "editar"; item?: ClienteItem }
  >({ open: false });
  const [modalDireccion, setModalDireccion] = useState<
    { open: false } | { open: true; modo: "crear" | "editar"; item?: EnviosDireccionItem }
  >({ open: false });
  const [modalEliminar, setModalEliminar] = useState<
    { open: false } | { open: true; kind: "cliente" | "direccion"; id: string; label: string }
  >({ open: false });
  const [deleting, setDeleting] = useState(false);

  const pintores = useMemo(
    () => clientesCatalogo.filter((c) => c.tipo === "PINTOR"),
    [clientesCatalogo]
  );
  const clientes = useMemo(
    () => clientesCatalogo.filter((c) => c.tipo === "CONSUMIDOR_FINAL"),
    [clientesCatalogo]
  );

  const clientesFiltrados = useMemo(() => {
    if (!qClienteDebounced.trim()) return clientes;
    return clientes.filter((item) =>
      matchByMultiTerm([item.nombreCompleto, item.cel], qClienteDebounced)
    );
  }, [clientes, qClienteDebounced]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => c.id === clienteId) ?? null,
    [clientes, clienteId]
  );

  const direccionesDelCliente = useMemo(() => {
    if (!clienteId) return [];
    return direcciones.filter((d) => d.personaId === clienteId);
  }, [direcciones, clienteId]);

  const direccionesFiltradas = useMemo(() => {
    if (!qDireccionDebounced.trim()) return direccionesDelCliente;
    return direccionesDelCliente.filter((item) =>
      matchByMultiTerm(
        [item.direccion, item.numeracion, item.referencia, item.urlMaps],
        qDireccionDebounced
      )
    );
  }, [direccionesDelCliente, qDireccionDebounced]);

  function refresh() {
    router.refresh();
  }

  function handleSelectCliente(id: string) {
    setClienteId(id);
    setDireccionId(null);
    busquedaDireccion.setQ("");
    setQDireccionDebounced("");
  }

  async function handleEliminar() {
    if (!modalEliminar.open || deleting) return;
    setDeleting(true);
    try {
      const res =
        modalEliminar.kind === "cliente"
          ? await eliminarClienteAction({ id: modalEliminar.id })
          : await eliminarEnviosDireccionAction({ id: modalEliminar.id });
      if (!res.ok) {
        toast.error(res.error ?? "No se pudo eliminar.");
        return;
      }
      toast.success(modalEliminar.kind === "cliente" ? "Cliente eliminado." : "Dirección eliminada.");
      if (modalEliminar.kind === "cliente" && clienteId === modalEliminar.id) {
        setClienteId(null);
        setDireccionId(null);
      }
      if (modalEliminar.kind === "direccion" && direccionId === modalEliminar.id) {
        setDireccionId(null);
      }
      setModalEliminar({ open: false });
      refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <ClassicFilteredTableLayout title="Envios" subtitle="Crear Envío" contentWidth="full">
        <div className="flex min-h-0 flex-1 flex-col pb-4">
          <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
              1. Seleccionar Cliente
            </p>
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
              <CatalogoFinderColumn
                titulo="CLIENTES"
                subtitulo={`${clientesFiltrados.length} cliente(s)`}
                mostrarNuevo
                onNuevo={() => setModalCliente({ open: true, modo: "crear" })}
              >
                <div className="sticky top-0 z-10 border-b border-border bg-card p-2">
                  <FiltroBusquedaInput
                    id="filtro-envios-clientes"
                    placeholder="BUSCAR CLIENTE..."
                    value={busquedaCliente.q}
                    onChange={busquedaCliente.handleQChange}
                    isDebouncing={busquedaCliente.isDebouncing}
                    inputRef={busquedaCliente.ref}
                  />
                </div>
                {clientes.length === 0 ? (
                  <CatalogoFinderEmpty mensaje="No hay clientes. Usá + para crear el primero." />
                ) : clientesFiltrados.length === 0 ? (
                  <CatalogoFinderEmpty mensaje="Ningún cliente coincide con la búsqueda." />
                ) : (
                  clientesFiltrados.map((item) => (
                    <CatalogoFinderRow
                      key={item.id}
                      nombre={nombreCompletoCliente(item)}
                      meta={
                        item.pintorAsociado
                          ? `${item.cel} · Pintor: ${nombreCompletoCliente(item.pintorAsociado)}`
                          : item.cel
                      }
                      selected={item.id === clienteId}
                      onClick={() => handleSelectCliente(item.id)}
                      mostrarAcciones
                      onEditar={() => setModalCliente({ open: true, modo: "editar", item })}
                      onEliminar={() =>
                        setModalEliminar({
                          open: true,
                          kind: "cliente",
                          id: item.id,
                          label: nombreCompletoCliente(item),
                        })
                      }
                    />
                  ))
                )}
              </CatalogoFinderColumn>

              <CatalogoFinderColumn
                titulo="DIRECCIONES"
                subtitulo={
                  clienteSeleccionado
                    ? nombreCompletoCliente(clienteSeleccionado)
                    : "Seleccioná un cliente"
                }
                mostrarNuevo={Boolean(clienteSeleccionado)}
                deshabilitada={!clienteSeleccionado}
                onNuevo={() => {
                  if (!clienteSeleccionado) return;
                  setModalDireccion({ open: true, modo: "crear" });
                }}
              >
                {!clienteSeleccionado ? (
                  <CatalogoFinderEmpty mensaje="Seleccioná un cliente para ver sus direcciones." />
                ) : (
                  <>
                    <div className="sticky top-0 z-10 border-b border-border bg-card p-2">
                      <FiltroBusquedaInput
                        id="filtro-envios-direcciones"
                        placeholder="BUSCAR DIRECCIÓN..."
                        value={busquedaDireccion.q}
                        onChange={busquedaDireccion.handleQChange}
                        isDebouncing={busquedaDireccion.isDebouncing}
                        inputRef={busquedaDireccion.ref}
                      />
                    </div>
                    {direccionesDelCliente.length === 0 ? (
                      <CatalogoFinderEmpty mensaje="No hay direcciones. Usá + para crear la primera." />
                    ) : direccionesFiltradas.length === 0 ? (
                      <CatalogoFinderEmpty mensaje="Ninguna dirección coincide con la búsqueda." />
                    ) : (
                      direccionesFiltradas.map((item) => (
                        <CatalogoFinderRow
                          key={item.id}
                          nombre={etiquetaDireccionEnvio(item)}
                          meta={item.referencia || undefined}
                          selected={item.id === direccionId}
                          onClick={() => setDireccionId(item.id)}
                          mostrarAcciones
                          onEditar={() => setModalDireccion({ open: true, modo: "editar", item })}
                          onEliminar={() =>
                            setModalEliminar({
                              open: true,
                              kind: "direccion",
                              id: item.id,
                              label: etiquetaDireccionEnvio(item),
                            })
                          }
                        />
                      ))
                    )}
                  </>
                )}
              </CatalogoFinderColumn>
            </div>
          </div>
        </div>
      </ClassicFilteredTableLayout>

      <CrearEditarClienteModal
        open={modalCliente.open}
        onOpenChange={(open) => {
          if (!open) setModalCliente({ open: false });
        }}
        modo={modalCliente.open ? modalCliente.modo : "crear"}
        item={modalCliente.open ? modalCliente.item : null}
        pintores={pintores}
        direcciones={direcciones}
        onCatalogoChanged={refresh}
        onSuccess={(item) => {
          if (item.tipo === "CONSUMIDOR_FINAL") {
            setClienteId(item.id);
            setDireccionId(null);
          }
          refresh();
        }}
      />
      <CrearEditarEnviosDireccionModal
        open={modalDireccion.open}
        onOpenChange={(open) => {
          if (!open) setModalDireccion({ open: false });
        }}
        modo={modalDireccion.open ? modalDireccion.modo : "crear"}
        personaId={clienteId ?? ""}
        item={modalDireccion.open ? modalDireccion.item : null}
        onSuccess={(item) => {
          setDireccionId(item.id);
          refresh();
        }}
      />
      <Dialog
        open={modalEliminar.open}
        onOpenChange={(open) => {
          if (!open && !deleting) setModalEliminar({ open: false });
        }}
      >
        <AppModal
          title={modalEliminar.open && modalEliminar.kind === "cliente" ? "Eliminar Cliente" : "Eliminar Dirección"}
          size="sm"
          actions={
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={deleting}
                onClick={() => setModalEliminar({ open: false })}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={deleting} onClick={() => void handleEliminar()}>
                Eliminar
              </Button>
            </div>
          }
        >
          <p className="text-sm text-foreground">
            ¿Eliminar {modalEliminar.open ? modalEliminar.label : ""}?
          </p>
        </AppModal>
      </Dialog>
    </>
  );
}
