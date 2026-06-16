"use client";

import { Button } from "@/components/ui/button";

interface ModalSiNoChoiceProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Par SÍ / NO en modales: opción activa `default` (primary), inactiva `outline`. */
export default function ModalSiNoChoice({ value, onChange, disabled }: ModalSiNoChoiceProps) {
  return (
    <div className="flex w-full min-w-0 gap-2">
      <Button
        type="button"
        variant={value ? "default" : "outline"}
        size="default"
        className="min-w-0 flex-1"
        disabled={disabled}
        onClick={() => onChange(true)}
      >
        SÍ
      </Button>
      <Button
        type="button"
        variant={!value ? "default" : "outline"}
        size="default"
        className="min-w-0 flex-1"
        disabled={disabled}
        onClick={() => onChange(false)}
      >
        NO
      </Button>
    </div>
  );
}
