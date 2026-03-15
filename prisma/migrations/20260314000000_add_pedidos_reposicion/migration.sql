-- CreateEnum
CREATE TYPE "FormaPedirReposicion" AS ENUM ('CANT_MAXIMA', 'CANT_FIJA');

-- CreateTable
CREATE TABLE "pedidos_reposicion" (
    "id" TEXT NOT NULL,
    "id_proveedor" TEXT NOT NULL,
    "sucursal" TEXT NOT NULL,
    "cod_ext" TEXT NOT NULL,
    "punto_reposicion" INTEGER NOT NULL,
    "forma_pedir" "FormaPedirReposicion" NOT NULL,
    "cant" INTEGER NOT NULL,
    "cant_pedir" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_reposicion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_reposicion_id_proveedor_sucursal_cod_ext_key" ON "pedidos_reposicion"("id_proveedor", "sucursal", "cod_ext");

-- AddForeignKey
ALTER TABLE "pedidos_reposicion" ADD CONSTRAINT "pedidos_reposicion_id_proveedor_fkey" FOREIGN KEY ("id_proveedor") REFERENCES "proveedores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_reposicion" ADD CONSTRAINT "pedidos_reposicion_sucursal_fkey" FOREIGN KEY ("sucursal") REFERENCES "sucursales"("codigo") ON DELETE RESTRICT ON UPDATE CASCADE;
