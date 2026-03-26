# Manual: cálculo de sobrestock en pedidos de reposición

Documento orientado a **desarrollo frontend** (y revisión funcional). Describe cómo el backend determina si hay “sobrestock” antes de generar un pedido al proveedor, **sin** depender de columnas en base de datos que guarden “excedente”: el valor se **calcula** en cada consulta.

---

## 1. Cuándo aplica

- Solo en el flujo de **Generar pedido** cuando la selección de tipos incluye **`REPOSICION`**.
- El pedido se arma para **un proveedor** y **la sucursal que ordena** (`guaymallen` o `maipu`).
- El servicio también revisa la **otra sucursal** para el mismo producto y proveedor (transferencia interna vs pedido al proveedor).
- Objetivo de producto: **advertir** si hay stock “de más” en la tienda que pide **o** en la otra, y **bloquear** hasta confirmación.

---

## 2. Fuentes de datos (lectura)

| Concepto | Origen | Notas para UI |
|----------|--------|----------------|
| Stock por sucursal | Tabla `precios_tienda` (`ListaPrecioTienda`) | Campos `stock_maipu` y `stock_guaymallen`. Para cada detección se usa el stock de la sucursal donde se evalúa el excedente (pedido u otra). |
| Tope / configuración de reposición | Tabla `pedidos_mercaderia` (`ItemPedidoEnvio`) | `reposicion_cant_conf` de la fila **de esa sucursal** (mismo proveedor, `tipo_de_pedido` REPOSICIÓN, mismo `cod_ext`). |
| Cantidad a pedir | Misma fila de ítem | `cant_pedir`. |

**Importante:** no existe una columna tipo `tiene_excedente` o `sobrestock` en base de datos. Lo que ve el usuario en el modal son campos **derivados** del cálculo.

---

## 3. Qué filas entran al cálculo (antes de las reglas)

El servicio `getSobreStockReposicionItems` solo mira filas que cumplan **todas** estas condiciones:

1. `id_proveedor` = proveedor seleccionado  
2. `sucursal_id` = sucursal seleccionada  
3. `tipo_de_pedido` = **`REPOSICION`**  
4. `cant_pedir` **>** `0`  
5. Existe fila en `precios_tienda` para el mismo `cod_ext` (si no hay catálogo tienda para ese código, el ítem **se omite**).

Si no queda ninguna fila tras estos filtros, la respuesta es `tieneSobreStock: false` e `items: []`.

---

## 4. Reglas de sobrestock (por ítem)

Para cada ítem que pasó la sección 3, se obtiene:

- **`stockSucursal`**: `stock_maipu` o `stock_guaymallen` según sucursal.  
- **¿Tiene configuración de reposición?**: **`reposicion_cant_conf > 0`** (tras interpretar el valor como número finito).

### Regla A — Con configuración (`reposicion_cant_conf > 0`)

- **Hay sobrestock** si: `stockSucursal > reposicion_cant_conf`  
- **Valor mostrado `sobreStock`**: `stockSucursal - reposicion_cant_conf`  
- **`topeReposicion` en la respuesta**: el mismo `reposicion_cant_conf` (número)

**Ejemplos**

| `reposicion_cant_conf` | `stockSucursal` | ¿Lista en modal? | `sobreStock` |
|------------------------|-----------------|------------------|--------------|
| 10 | 15 | Sí | 5 |
| 10 | 10 | No (stock no es mayor que el tope) | — |
| 10 | 8 | No | — |

### Regla B — Sin configuración (`reposicion_cant_conf` nulo o ≤ 0)

- **Hay sobrestock** si: `stockSucursal > 0`  
- **Valor mostrado `sobreStock`**: igual a **`stockSucursal`** (toda la cantidad en sucursal se trata como excedente bajo esta regla)  
- **`topeReposicion` en la respuesta**: **`null`** (en UI la celda **TOPE REPOSICIÓN** queda vacía)

**Ejemplos**

| `reposicion_cant_conf` | `stockSucursal` | ¿Lista en modal? | `sobreStock` | `topeReposicion` |
|------------------------|-----------------|------------------|--------------|------------------|
| 0 | 3 | Sí | 3 | `null` |
| 0 | 0 | No | — | — |
| `null` | 12 | Sí | 12 | `null` |

### Regla C — Otra sucursal (`origenDeteccion: OTRA_SUCURSAL`)

Para cada ítem que entra por la sección 3 (pedido en sucursal **A** con `cant_pedir > 0`):

1. Se buscan en `pedidos_mercaderia` filas **REPOSICIÓN** en la **otra** sucursal **B** con el mismo `cod_ext` (**sin** exigir el mismo `id_proveedor` que el pedido: el mismo producto puede estar configurado con otro proveedor en B).  
2. **Tope usado en B:** preferencia fila con el **mismo** `id_proveedor` que el pedido; si no hay, una fila con `reposicion_cant_conf > 0`; si no, la primera fila. Si **no hay ninguna fila** en B pero en A sí hay `reposicion_cant_conf > 0`, se usa el tope de **A** como referencia para comparar el stock de B (misma política de máximo).  
3. Solo se evalúa si hay “ancla” de tope: alguna fila en B con tope &gt; 0 **o** tope &gt; 0 en la línea del pedido en A.  
4. Se aplican las **Reglas A y B** con el **stock de B** en `precios_tienda` y el tope resuelto.  
5. Si hay sobrestock, se agrega un ítem `OTRA_SUCURSAL` con `cantPedir` de la línea en **A**.

**Ejemplo:** En Guaymallén el tope es 2 y el stock 4 → sobrestock 2. Maipú pide el mismo `cod_ext` (`cant_pedir > 0`) aunque el proveedor elegido en el modal no coincida con el de la fila de Guaymallén: igual debe advertirse si el stock en Guaymallén supera el tope resuelto.

---

## 5. Forma de la respuesta hacia el cliente (Server Action)

La action `getSobreStockReposicionParaModalAction` devuelve algo equivalente a:

```ts
{
  ok: true,
  data: {
    tieneSobreStock: boolean;  // true si items.length > 0
    items: Array<{
      idItemPedidoEnvio: string;
      codExt: string;
      codTienda: string | null;
      descripcionProveedor: string;
      descripcionTienda: string | null;
      stockSucursal: number;
      topeReposicion: number | null;  // null = sin tope (Regla B)
      sobreStock: number;
      cantPedir: number;
      sucursalCodigoSobrestock: "guaymallen" | "maipu";
      origenDeteccion: "LOCAL" | "OTRA_SUCURSAL";
    }>;
  };
}
```

**Convención de UI (alineada a `FRONTEND_GUIDELINES.md`):** en la columna **TOPE REPOSICIÓN**, si `topeReposicion === null`, la celda queda **vacía** (string vacío), sin guiones.

---

## 6. Cómo encaja con “Generar pedido”

1. El usuario confirma **Generar Pedido** en el modal de filtros.  
2. El cliente llama `generarPdfEnviarPedidoAction` **sin** `confirmarSobreStock` (o con `confirmarSobreStock: false`).  
3. Si `tipos` incluye **REPOSICION** y hay ítems con sobrestock, el servidor responde **`SOBRESTOCK_REQUIERE_CONFIRMACION:{n}`** **antes** de crear el snapshot en base — no hay persistencia de historial todavía.  
4. El cliente entonces llama `getSobreStockReposicionParaModalAction` y abre el modal con la tabla.  
5. **Pedir al proveedor igual** reintenta `generarPdfEnviarPedidoAction` con **`confirmarSobreStock: true`**.

El bloqueo lo define siempre el backend; el cliente solo rellena el modal tras el error o puede confiar en esa respuesta como única señal de bloqueo.

---

## 7. Referencias en código

| Pieza | Ubicación |
|-------|-----------|
| Lógica de cálculo | `src/services/sobreStock.service.ts` → `getSobreStockReposicionItems` |
| Exposición al cliente | `src/actions/pedidos.ts` → `getSobreStockReposicionParaModalAction`, validación en `generarPdfEnviarPedidoAction` |
| Modal de advertencia | `src/components/shared/SobreStockReposicionAdvertenciaModal.tsx` |
| Orquestación del botón | `src/components/pedidos/GenerarPedidoToolbarButton.tsx` |

---

## 8. Resumen en una frase

**Sobrestock** = misma comparación stock vs tope que antes, aplicada a la sucursal que **pide** y, si hay fila de reposición en la **otra** tienda, también allí, para ítems **REPOSICIÓN** con **`cant_pedir > 0`** en el pedido; **no se persiste** el excedente en una columna dedicada.
