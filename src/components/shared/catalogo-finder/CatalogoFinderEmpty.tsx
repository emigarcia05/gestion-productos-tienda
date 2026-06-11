import { TableEmptyState } from "@/components/shared/TableEmptyState";

export default function CatalogoFinderEmpty({ mensaje }: { mensaje: string }) {
  return (
    <TableEmptyState
      message={mensaje}
      placement="compact"
      textSize="xs"
      maxWidth="full"
      className="flex h-full min-h-[120px] items-center justify-center px-4"
    />
  );
}
