/**
 * Tipos base para componentes dinámicos reutilizables (Modal, Drawer).
 * Usar genéricos para que cada instancia tenga datos y callbacks coherentes sin duplicar lógica.
 */

/** Props base para contenido de modal controlado (open/onOpenChange). */
export interface BaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Props para un modal cuyo contenido trabaja con datos de tipo T
 * y puede enviar un resultado de tipo TSubmit al confirmar.
 * Útil para formularios de edición, confirmaciones con payload, etc.
 */
export interface ModalContentProps<T = void, TSubmit = void> extends BaseModalProps {
  /** Datos iniciales o contexto (ej. entidad a editar). */
  data?: T
  /** Llamada al confirmar; el payload puede ser derivado de T o otro tipo. */
  onSubmit?: (payload: TSubmit) => void | Promise<void>
  /** Llamada al cancelar/cerrar sin enviar. */
  onCancel?: () => void
}

/**
 * Props para un drawer lateral con el mismo patrón que Modal.
 * Reutilizar genéricos T / TSubmit según el caso de uso.
 */
export interface DrawerContentProps<T = void, TSubmit = void> extends BaseModalProps {
  data?: T
  onSubmit?: (payload: TSubmit) => void | Promise<void>
  onCancel?: () => void
}

/** Props mínimas para un diálogo de confirmación (sin genéricos de datos). */
export interface ConfirmDialogProps extends BaseModalProps {
  title: string
  description?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  /** Texto del botón de confirmar (ej. "Eliminar", "Guardar"). */
  confirmLabel?: string
  /** Variante del botón de confirmar (ej. destructive). */
  confirmVariant?: "default" | "destructive"
}
