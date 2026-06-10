"use client";

import { useEffect, useState } from "react";

let pending = false;
const listeners = new Set<() => void>();

/** Marca Act. Cx. en curso en cliente (antes de que el poll del sidebar vea el mutex). */
export function setActCxClientPending(value: boolean): void {
  if (pending === value) return;
  pending = value;
  for (const fn of listeners) fn();
}

export function useActCxClientPending(): boolean {
  const [isPending, setIsPending] = useState(pending);

  useEffect(() => {
    const sync = () => setIsPending(pending);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  return isPending;
}
