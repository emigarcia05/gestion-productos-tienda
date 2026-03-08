# Filtros dinámicos – Regla de negocio

## Objetivo

Que en cualquier pantalla con filtros (Proveedor, Marca, Rubro, etc.) el usuario pueda **cambiar siempre** el valor de cualquier filtro sin que las opciones del desplegable se reduzcan por lo elegido en los demás.

## Regla

1. **Opciones de cada desplegable**  
   La lista de opciones de **cada** filtro (Proveedor, Marca, Rubro, Subrubro, Sucursal, etc.) debe ser **siempre la lista completa** de esa dimensión (o solo acotada por búsqueda global, si se define así).  
   **No** se debe restringir la lista de un filtro por los valores seleccionados en **otros** filtros.

2. **Resultados (tabla / lista)**  
   Los datos mostrados (tabla, lista de ítems) **sí** se filtran por la **combinación** de todos los filtros aplicados.

3. **Resumen**  
   - Desplegable del filtro A → todas las opciones de A.  
   - Desplegable del filtro B → todas las opciones de B.  
   - Tabla/resultados → filtrados por A + B + … (todos los filtros).

## Dónde aplicarla

- Lista Precios (Proveedor, Marca).
- Sugeridos (Proveedor, Marca).
- Tienda (Marca, Rubro, Subrubro).
- Pedidos u otras pantallas con filtros dinámicos (Proveedor, Sucursal, etc.).
- Cualquier pantalla nueva que agregue filtros con opciones cargadas desde backend.

## Implementación en backend

Al calcular las listas para los desplegables:

- **No** pasar el valor del “otro” filtro al armar la lista de un filtro.
- Ejemplo: para `proveedoresDisponibles` no usar la marca seleccionada; para `marcasDisponibles` no usar el proveedor seleccionado.
- Opcional: sí se puede restringir todas las listas por **búsqueda global** (q) si está definido así.

## Referencia en código

- **Lista Precios / Sugeridos:** `src/actions/listaPrecios.ts` (`getListaPreciosConOpcionesAction`), `src/services/listaPrecios.service.ts` (`getProveedoresDisponiblesListaPrecios`, `getMarcasDisponiblesListaPrecios`).
- **Tienda:** `src/actions/tienda.ts` (`getTiendaPageData`); al armar `marcas`, `rubros`, `subRubros` para los desplegables no usar filtros de las otras dimensiones (solo búsqueda q si aplica).
- Al agregar nuevos filtros dinámicos, revisar que las listas de opciones sigan esta regla.
