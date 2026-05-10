import ClassicFilteredTableLayout from "@/components/shared/ClassicFilteredTableLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const MESES_CALENDARIO: { valor: number; etiqueta: string }[] = [
  { valor: 1, etiqueta: "ENERO" },
  { valor: 2, etiqueta: "FEBRERO" },
  { valor: 3, etiqueta: "MARZO" },
  { valor: 4, etiqueta: "ABRIL" },
  { valor: 5, etiqueta: "MAYO" },
  { valor: 6, etiqueta: "JUNIO" },
  { valor: 7, etiqueta: "JULIO" },
  { valor: 8, etiqueta: "AGOSTO" },
  { valor: 9, etiqueta: "SEPTIEMBRE" },
  { valor: 10, etiqueta: "OCTUBRE" },
  { valor: 11, etiqueta: "NOVIEMBRE" },
  { valor: 12, etiqueta: "DICIEMBRE" },
];

const TH_NUM = "text-right whitespace-nowrap";
const TD_NUM = "celda-datos text-right tabular-nums";

interface Props {
  anio: number;
}

/** Celda numérica pendiente de definición de reglas de negocio. */
function CeldaIvaPendiente() {
  return <span className="text-muted-foreground">—</span>;
}

export default function FinanzasBalancePosicionIvaPage({ anio }: Props) {
  return (
    <div className="area-page-shell">
      <ClassicFilteredTableLayout title="Balance" subtitle="Posición de IVA" contentWidth="full">
        <div className="flex flex-1 min-h-0 flex-col pb-4">
          <div className="contenedor-tabla-gestion flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
              <div data-slot="table-container" className="relative w-full min-w-0 max-w-full">
                <Table
                  data-slot="table"
                  className="w-full caption-bottom text-sm tabla-gestion-compacta table-fixed"
                >
                  <colgroup>
                    <col style={{ width: "28%" }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "24%" }} />
                    <col style={{ width: "24%" }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-0">MES</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>IVA DÉBITO</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>IVA CRÉDITO</TableHead>
                      <TableHead className={cn(TH_NUM, "min-w-0")}>IVA SALDO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MESES_CALENDARIO.map((m) => (
                      <TableRow key={m.valor}>
                        <TableCell className="celda-datos min-w-0 whitespace-nowrap font-medium">
                          {m.etiqueta} {anio}
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "min-w-0")}>
                          <CeldaIvaPendiente />
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "min-w-0")}>
                          <CeldaIvaPendiente />
                        </TableCell>
                        <TableCell className={cn(TD_NUM, "min-w-0")}>
                          <CeldaIvaPendiente />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </ClassicFilteredTableLayout>
    </div>
  );
}
