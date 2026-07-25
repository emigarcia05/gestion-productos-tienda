/**
 * Escritura CSV UTF-8 con BOM (Excel) y escape RFC4180.
 */
import fs from "node:fs/promises";
import path from "node:path";

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function writeCsv(
  filePath: string,
  columns: readonly string[],
  rows: Array<Record<string, string>>,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const lines: string[] = [];
  lines.push(columns.join(","));
  for (const row of rows) {
    lines.push(columns.map((col) => escapeCsvCell(row[col] ?? "")).join(","));
  }
  // BOM UTF-8 para Excel en Windows
  const body = `\uFEFF${lines.join("\n")}\n`;
  await fs.writeFile(filePath, body, "utf8");
}
