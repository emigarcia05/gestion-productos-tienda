# API DUX – Actualización de costos

Este documento describe el contrato del endpoint de la API DUX para **actualizar costos** de ítems.  
**No** existe en la documentación DUX un POST para actualizar stock; solo se puede actualizar costo mediante este endpoint.

## Endpoint

- **Método:** `POST`
- **URL:** `https://erp.duxsoftware.com.ar/WSERP/rest/services/item/nuevoItem`
- **Headers:**
  - `accept: application/json`
  - `authorization: <DUX_API_TOKEN>` (credencial en variable de entorno `DUX_API_TOKEN`)
  - `content-type: application/json`

## Cuerpo del request (JSON)

- **Un ítem:** objeto `{ cod_item, costo, id_proveedor }`.
- **Lote (recomendado):** array de hasta 50 objetos con los mismos campos.

| Campo          | Tipo   | Descripción                                      |
|----------------|--------|--------------------------------------------------|
| `cod_item`     | STRING | Código del ítem en DUX (ej. código de tienda).  |
| `costo`        | double | Nuevo costo a enviar.                            |
| `id_proveedor` | (según API) | ID del proveedor en DUX (origen del costo). |

En nuestra aplicación, el valor de `id_proveedor` se obtiene del campo **`proveedores.id_proveedor_dux`**. La exportación envía lotes de hasta 50 ítems por petición, con una pausa de 5 segundos entre lotes (límite de la API).
