"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type TableVariant = "default" | "compact"

interface TableProps extends React.ComponentProps<"table"> {
  variant?: TableVariant
  /** Si false, desactiva el scroll horizontal del contenedor (solo scroll vertical si aplica). Default true. */
  scrollX?: boolean
}

function Table({ className, variant = "default", scrollX = true, ...props }: TableProps) {
  const tableClass =
    variant === "compact"
      ? cn("tabla-gestion-compacta", className)
      : cn("tabla-global", className)
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full", scrollX ? "overflow-x-auto" : "overflow-x-hidden")}
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", tableClass)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-primary [&_tr]:border-0 [&_tr]:bg-transparent [&_tr:hover]:bg-transparent", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-b-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors duration-150",
        "odd:bg-card even:bg-blue-50/50",
        "hover:bg-primary/10 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "bg-transparent text-primary-foreground font-bold text-center align-middle whitespace-nowrap uppercase",
        "h-12 px-3 py-4",
        "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "text-foreground text-sm font-normal text-center align-middle whitespace-nowrap",
        "px-3 py-4",
        "[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

/** Fila vacía reutilizable: tabla visible sin datos (ej. sin filtros o sin resultados). */
function EmptyTableRow({
  colSpan,
  message,
  className,
}: {
  colSpan: number;
  message: string;
  className?: string;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className={cn("py-8 text-muted-foreground text-center", className)}
      >
        <span className="text-sm max-w-md inline-block px-4">{message}</span>
      </TableCell>
    </TableRow>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  EmptyTableRow,
}
