"use client";

import { Dialog } from "@/components/ui/dialog";
import AppModal from "@/components/shared/AppModal";
import ModalMicroLabel from "@/components/shared/ModalMicroLabel";
import { Button } from "@/components/ui/button";
import {
  FIN_ANA_COS_FINA_IMP_CHEQUE_FACTOR,
  FIN_ANA_COS_FINA_IVA_FACTOR,
} from "@/lib/finAnaCosFina";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FormulaLinea({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm leading-relaxed text-foreground", className)}>
      {children}
    </p>
  );
}

function FormulaDestacada({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
      {children}
    </p>
  );
}

export default function CalculoCxTotalFinAnaCosFinaModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppModal
        title="Cálculo Cx. Total"
        size="lg"
        className="max-w-xl"
        scrollBody
        actions={
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Los valores se expresan en escala porcentual (0–100) con 2 decimales. Los componentes
            intermedios no se muestran en la grilla; solo <strong>CX TOTAL S/ IVA</strong> y{" "}
            <strong>CX TOTAL C/ IVA</strong>.
          </p>

          <div className="flex flex-col gap-2">
            <ModalMicroLabel>COMPONENTES</ModalMicroLabel>
            <FormulaLinea>
              <strong>CX TERMINAL</strong> = ARANCEL + CX FINANCIERO
            </FormulaLinea>
            <FormulaLinea>
              <strong>IVA</strong> = (CX TERMINAL × {FIN_ANA_COS_FINA_IVA_FACTOR.toLocaleString("es-AR")}) −
              CX TERMINAL
            </FormulaLinea>
            <FormulaLinea>
              <strong>Imp. Cheque</strong>: si <strong>IMP. CHEQUE</strong> está desactivado → 0; si está
              activado →
            </FormulaLinea>
            <FormulaDestacada>
              (1 − (CX TERMINAL + IVA) / 100) × {FIN_ANA_COS_FINA_IMP_CHEQUE_FACTOR.toLocaleString("es-AR")} ×
              100
            </FormulaDestacada>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <ModalMicroLabel>CX TOTAL S/ IVA</ModalMicroLabel>
            <FormulaDestacada>CX TERMINAL + Imp. Cheque</FormulaDestacada>
          </div>

          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <ModalMicroLabel>CX TOTAL C/ IVA</ModalMicroLabel>
            <FormulaDestacada>CX TERMINAL + IVA + Imp. Cheque</FormulaDestacada>
          </div>
        </div>
      </AppModal>
    </Dialog>
  );
}
