"use client";

import { useRef, useState, useEffect, useCallback } from "react";

export interface UseFiltrosConBusquedaOptions {
  /** Valor inicial y sincronizado desde la URL (ej. después de navegación). */
  qActual: string;
  /** Milisegundos de debounce antes de invocar onDebouncedSearch. */
  debounceMs: number;
  /** Se llama con el valor del input tras el debounce (navegar, actualizar URL, etc.). */
  onDebouncedSearch: (value: string) => void;
  /**
   * Pequeña espera adicional antes de ejecutar la búsqueda.
   * Si el usuario vuelve a escribir en ese lapso, la búsqueda pendiente se cancela.
   */
  commitDelayMs?: number;
  /**
   * Si se define, al montar se restaura el foco en el input cuando la clave en sessionStorage es "1".
   * Útil cuando la navegación es por window.location.href (recarga). El padre debe llamar
   * prepareNavigate() antes de asignar window.location.href para guardar el foco.
   */
  focusStorageKey?: string;
}

export interface UseFiltrosConBusquedaResult {
  /** Valor controlado del input de búsqueda. */
  q: string;
  /** Para sincronizar desde fuera (ej. limpiar). */
  setQ: (value: string) => void;
  ref: React.RefObject<HTMLInputElement | null>;
  /** Pasar a onChange del input: onChange={(e) => handleQChange(e.target.value)}. */
  handleQChange: (value: string) => void;
  /** true mientras hay un debounce pendiente (mostrar Loader en el input). */
  isDebouncing: boolean;
  /** Llamar antes de navegar (window.location.href) si se usa focusStorageKey. */
  prepareNavigate: () => void;
}

/**
 * Hook reutilizable para filtros con input de búsqueda: estado local, debounce,
 * restauración de foco tras recarga y señal de carga.
 * Usado por FiltrosProductos, FiltrosTienda, FiltrosPedidoUrgente, etc.
 */
export function useFiltrosConBusqueda({
  qActual,
  debounceMs,
  onDebouncedSearch,
  focusStorageKey,
  commitDelayMs = 250,
}: UseFiltrosConBusquedaOptions): UseFiltrosConBusquedaResult {
  const [q, setQ] = useState(qActual);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editSeqRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar q cuando cambia la URL (ej. router.push o props tras navegación).
  // Si el usuario sigue escribiendo en el input, no pisar su texto con un valor
  // "viejo" que llegue por una navegación previa en curso.
  useEffect(() => {
    const isInputFocused = document.activeElement === inputRef.current;
    const userTypingNewerValue = isInputFocused && q !== qActual;
    if (userTypingNewerValue) return;
    setQ(qActual);
    setIsDebouncing(false);
  }, [q, qActual]);

  // Restaurar foco en el input tras recarga cuando el usuario venía del buscador.
  useEffect(() => {
    if (!focusStorageKey) return;
    const shouldFocus = sessionStorage.getItem(focusStorageKey);
    if (shouldFocus === "1") {
      sessionStorage.removeItem(focusStorageKey);
      const el = inputRef.current;
      if (el) {
        el.focus();
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
  }, [focusStorageKey]);

  const handleQChange = useCallback(
    (value: string) => {
      editSeqRef.current += 1;
      setQ(value);
      setIsDebouncing(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (commitRef.current) clearTimeout(commitRef.current);
      const seqAtInput = editSeqRef.current;
      debounceRef.current = setTimeout(() => {
        commitRef.current = setTimeout(() => {
          // Si el usuario siguió escribiendo, se descarta esta navegación.
          if (editSeqRef.current !== seqAtInput) return;
          onDebouncedSearch(value);
          setIsDebouncing(false);
          commitRef.current = null;
        }, commitDelayMs);
        debounceRef.current = null;
      }, debounceMs);
    },
    [commitDelayMs, debounceMs, onDebouncedSearch]
  );

  const prepareNavigate = useCallback(() => {
    if (focusStorageKey && document.activeElement === inputRef.current) {
      sessionStorage.setItem(focusStorageKey, "1");
    }
  }, [focusStorageKey]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (commitRef.current) clearTimeout(commitRef.current);
    };
  }, []);

  return { q, setQ, ref: inputRef, handleQChange, isDebouncing, prepareNavigate };
}
