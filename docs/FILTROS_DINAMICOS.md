# Filtros dinámicos – Regla de negocio

## Objetivo

Que el usuario pueda **empezar a filtrar por cualquier filtro** (Proveedor, Marca, etc.) y que las opciones de cada desplegable se adapten a lo ya seleccionado en los demás, reduciendo combinaciones vacías y mejorando la usabilidad.

## Regla: comportamiento simétrico

1. **Opciones de cada desplegable**  
   Cada filtro muestra solo opciones que tengan **al menos un ítem** con lo seleccionado en los **otros** filtros (y búsqueda global si aplica).  
   - Si no hay nada seleccionado en los demás: lista completa de esa dimensión.  
   - Si hay selección en otro(s) filtro(s): opciones filtradas por esa(s) selección(es).

2. **Resultados (tabla / lista)**  
   Los datos mostrados se filtran por la **intersección** de todos los filtros aplicados (y búsqueda).

3. **Resumen**  
   - Desplegable A → opciones que existen con lo seleccionado en B, C, …  
   - Desplegable B → opciones que existen con lo seleccionado en A, C, …  
   - Tabla/resultados → filtrados por A + B + C + … (todos los filtros).

## Ejemplo (módulo Proveedores: Proveedor y Marca)

| Usuario eligió        | Opciones Proveedor      | Opciones Marca          |
|-----------------------|-------------------------|--------------------------|
| Nada                  | Todos                   | Todas                    |
| Solo Proveedor "Rex"  | Todos                   | Solo marcas con ítems de Rex |
| Solo Marca "Sinteplast" | Solo proveedores con Sinteplast | Todas |
| Rex + Sinteplast      | Lista filtrada por Sinteplast (Rex sigue) | Lista filtrada por Rex (Sinteplast sigue) |

La tabla siempre se filtra por Proveedor + Marca (y búsqueda). El usuario puede comenzar por Proveedor o por Marca.

## Dónde aplicarla

- **Lista Precios** (Proveedor, Marca): implementado con lógica simétrica.
- **Sugeridos** (Proveedor, Marca): misma action, misma lógica.
- **Tienda** (Marca, Rubro, SubRubro): aplicar la misma regla (cada desplegable filtrado por los demás).
- Cualquier pantalla nueva con filtros dinámicos.

## Implementación en backend

Al calcular las listas para los desplegables:

- **Sí** pasar el valor de los otros filtros al armar la lista de un filtro.
- Ejemplo: `proveedoresDisponibles` se calcula con la Marca seleccionada; `marcasDisponibles` con el Proveedor seleccionado.
- Opcional: restringir todas las listas por **búsqueda global** (q) si está definido.

## Referencia en código

- **Lista Precios / Sugeridos:** `src/actions/listaPrecios.ts` (`getListaPreciosConOpcionesAction` pasa `marca` a `getProveedoresDisponiblesListaPrecios` y `prov` a `getMarcasDisponiblesListaPrecios`). Servicio: `src/services/listaPrecios.service.ts`.
- **Tienda:** `src/actions/tienda.ts`; al agregar o ajustar filtros, aplicar la misma regla simétrica.
- Al agregar nuevos filtros dinámicos, mantener esta regla para consistencia en la webapp.
