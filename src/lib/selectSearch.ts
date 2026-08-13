import * as React from "react";

/** Normaliza texto para filtrar opciones de desplegable (sin acentos, minúsculas). */
export function normalizeSelectSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es")
    .trim();
}

/** true si `label` contiene `query` (vacío = coincide todo). */
export function selectOptionMatchesQuery(label: string, query: string): boolean {
  const q = normalizeSelectSearchText(query);
  if (!q) return true;
  return normalizeSelectSearchText(label).includes(q);
}

/** Extrae texto visible de un ReactNode (para filtrar SelectItem sin textValue). */
export function getReactNodeText(node: React.ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getReactNodeText).join(" ");
  if (React.isValidElement(node)) {
    const props = node.props as {
      children?: React.ReactNode;
      textValue?: string;
    };
    if (typeof props.textValue === "string" && props.textValue.trim() !== "") {
      return props.textValue;
    }
    return getReactNodeText(props.children);
  }
  return "";
}

/** Filtra un arreglo por etiqueta según el query del buscador de desplegable. */
export function filterItemsBySelectSearch<T>(
  items: readonly T[],
  query: string,
  getLabel: (item: T) => string
): T[] {
  if (!normalizeSelectSearchText(query)) return [...items];
  return items.filter((item) => selectOptionMatchesQuery(getLabel(item), query));
}
