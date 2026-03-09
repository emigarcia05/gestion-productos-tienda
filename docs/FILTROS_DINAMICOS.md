# Filtros dinámicos – Regla unificada

## Objetivo

Que el usuario pueda **empezar a filtrar por cualquier filtro** (Proveedor, Marca, Rubro, etc.) y que las opciones de cada desplegable se adapten a lo ya seleccionado en los demás, reduciendo combinaciones vacías y mejorando la usabilidad.

## Regla única (todos los filtros)

**Todos los filtros de la aplicación siguen la misma lógica.** No hay excepciones por pantalla ni por dimensión.

1. **Opciones de cada desplegable**  
   Cada filtro muestra solo opciones que tengan **al menos un ítem** que cumpla lo seleccionado en **todos los demás** filtros (y búsqueda global si aplica).
   - Si no hay nada seleccionado en los demás: lista completa de esa dimensión.
   - Si hay selección en otro(s) filtro(s): opciones filtradas por esa(s) selección(es).

2. **Resultados (tabla / lista)**  
   Los datos mostrados se filtran por la **intersección** de todos los filtros aplicados (y búsqueda).

3. **Resumen**  
   - Desplegable A → opciones que existen con lo seleccionado en B, C, …  
   - Desplegable B → opciones que existen con lo seleccionado en A, C, …  
   - Desplegable C → opciones que existen con lo seleccionado en A, B, …  
   - Tabla/resultados → filtrados por A + B + C + … (todos los filtros).

## Ejemplo (Lista Precios: Proveedor, Marca, Rubro)

| Usuario eligió        | Opciones Proveedor      | Opciones Marca          | Opciones Rubro          |
|-----------------------|-------------------------|--------------------------|--------------------------|
| Nada                  | Todos                   | Todas                    | Todos                    |
| Solo Proveedor "Rex"  | Todos                   | Marcas con ítems de Rex  | Rubros con ítems de Rex  |
| Solo Marca "Sinteplast" | Proveedores con Sinteplast | Todas                 | Rubros con Sinteplast    |
| Rex + Sinteplast      | Lista filtrada por Marca+Rubro (Rex se mantiene) | Lista filtrada por Prov+Rubro | Lista filtrada por Prov+Marca |

La tabla siempre se filtra por Proveedor + Marca + Rubro (y búsqueda). El usuario puede comenzar por cualquier filtro.

## Dónde aplicarla

- **Lista Precios** (`/proveedores/lista-precios`): Proveedor, Marca, Rubro.
- **Sugeridos** (`/proveedores/sugeridos`): Proveedor, Marca (y Rubro si se agrega la columna).
- **Tienda** (`/tienda`): Marca, Rubro, SubRubro: misma regla (cada desplegable filtrado por los demás).
- Cualquier pantalla nueva con filtros dinámicos.

## Implementación en backend (checklist)

Al agregar un **nuevo filtro** (ej. Rubro) en una pantalla que ya tiene filtros dinámicos:

1. **Tabla de datos**  
   - Añadir la columna correspondiente al modelo (ej. `rubro` en `precios_proveedores`).
   - Crear migración y aplicarla.

2. **Servicio de datos**  
   - Incluir el campo en el tipo de fila para el cliente (ej. `FilaListaPrecioParaCliente.rubro`).
   - En la función que obtiene las **filas filtradas** (ej. `getListaPreciosConTiendaFiltrada`):
     - Añadir parámetro para el nuevo filtro (ej. `rubroNombre`).
     - Incluir en `tieneFiltro` la condición del nuevo filtro.
     - Añadir en `andParts` el filtro por ese campo (ej. `if (rubro) andParts.push({ rubro })`).
     - Mapear el campo en el resultado (ej. `rubro: f.rubro ?? null`).
   - Crear función **“opciones disponibles”** para el nuevo filtro (ej. `getRubrosDisponiblesListaPrecios(proveedorId, marcaNombre, busqueda, opciones)`):
     - Llamar a la función de filas filtrada pasando **los otros** filtros (no el propio).
     - Devolver lista de valores únicos no vacíos de ese campo (ej. rubros distintos).
   - En las funciones de opciones de **los demás** filtros:
     - Añadir el parámetro del nuevo filtro y pasarlo a la función de filas filtrada (ej. `getProveedoresDisponiblesListaPrecios(marcaNombre, rubroNombre, busqueda)` y dentro llamar a `getListaPreciosConTiendaFiltrada(undefined, marca, rubro, busqueda)`).

3. **Server Action**  
   - Añadir el parámetro del nuevo filtro a la action (ej. `rubroNombre`).
   - Llamar en paralelo: filas filtradas (con todos los filtros), opciones de Proveedor (con Marca + Rubro), opciones de Marca (con Proveedor + Rubro), opciones de Rubro (con Proveedor + Marca).
   - Devolver en el resultado las opciones del nuevo filtro (ej. `rubrosDisponibles`).

4. **Cliente (componente con filtros)**  
   - Estado para el valor seleccionado (ej. `rubroNombre`).
   - Estado para las opciones del desplegable (ej. `rubrosOptions`), inicializado desde props o `[]`.
   - Incluir el nuevo filtro en la condición “hay filtro activo” y en “limpiar filtros”.
   - Al llamar a la action, pasar el nuevo parámetro; al recibir la respuesta, actualizar las opciones del nuevo desplegable (y mantener la opción actualmente seleccionada en la lista si ya no viene, para que el Select no quede en blanco).
   - Añadir el `<Select>` del nuevo filtro en la barra de filtros (misma estructura que los demás).
   - Si la tabla muestra datos por fila, añadir la columna correspondiente (ej. columna RUBRO).

## Referencia en código

- **Lista Precios:** `src/actions/listaPrecios.ts` (`getListaPreciosConOpcionesAction`). Servicio: `src/services/listaPrecios.service.ts` (`getListaPreciosConTiendaFiltrada`, `getProveedoresDisponiblesListaPrecios`, `getMarcasDisponiblesListaPrecios`, `getRubrosDisponiblesListaPrecios`).
- **Sugeridos:** misma action y servicio con `opciones.soloPxSugerido`.
- **Tienda:** `src/actions/tienda.ts`; al agregar o ajustar filtros, aplicar la misma regla simétrica.
- **Documento:** este archivo. En caso de duda sobre cómo implementar un filtro nuevo, seguir esta regla y el checklist anterior.
