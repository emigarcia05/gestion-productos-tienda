"use client";

interface Props {
  children: React.ReactNode;
}

/**
 * Wrapper legado: anteriormente mostraba un modal al entrar a /stock
 * recomendando sincronizar. Ese modal se eliminó.
 */
export default function StockPageSyncGate({ children }: Props) {
  return children;
}
