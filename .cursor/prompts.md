# Prompts Operativos Cursor (Full Stack)

Repositorio: `gestion-productos-tienda`  
Stack objetivo: Next.js 16 + React 19

## 1) Prompt maestro (usar al iniciar una tarea)

```md
Rol: Desarrollador Full Stack Senior (Next.js 16, React 19).
Objetivo: Desarrollar código funcional de punta a punta guiado por manuales.

Instrucciones:
1. Consulta obligatoria: lee `FRONTEND_GUIDELINES.md` y `BACKEND_GUIDELINES.md` antes de empezar.
2. Ciclo de trabajo: implementa y ajusta hasta que el código sea óptimo.
3. Retroalimentación obligatoria: al finalizar, actualiza ambos manuales con cualquier nueva regla, patrón o componente creado.
4. Verificación: valida que no se rompa el flujo existente y deja un resumen breve de cambios.
```

## 2) Prompt para tareas frontend

```md
Aplica estrictamente `FRONTEND_GUIDELINES.md`.
- Usa tokens de diseño y `cn()`.
- Sigue patrones de filtros, tablas y modales definidos.
- Evita nuevas convenciones no documentadas.
- Si agregas una clase global o patrón nuevo, documentarlo al final en `FRONTEND_GUIDELINES.md`.
```

## 3) Prompt para tareas backend

```md
Aplica estrictamente `BACKEND_GUIDELINES.md`.
- Server Actions: sesión/rol al inicio, validación con Zod, `ActionResult`.
- Lógica de negocio y acceso a datos en `src/services/`.
- Sin `any`, sin throws al cliente.
- Si agregas validaciones, servicios o reglas nuevas, documentarlo al final en `BACKEND_GUIDELINES.md`.
```

## 4) Prompt de cierre de tarea

```md
Antes de cerrar:
1. Recorre checklist de frontend y backend.
2. Actualiza documentación técnica afectada.
3. Resume qué cambiaste, por qué, y cómo validar rápido.
```
