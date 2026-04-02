import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

interface SeedCsvOptions {
  delimiter: string;
  /** Map CSV header → SQL column name (only for mismatches) */
  columnMap?: Record<string, string>;
  /** CSV headers to skip (not in target table) */
  skipColumns?: string[];
  /** Replace comma with dot in numeric values */
  decimalComma?: boolean;
  /** Max rows to insert (0 = unlimited) */
  limit?: number;
  /** ON CONFLICT clause (e.g., "DO NOTHING") */
  onConflict?: string;
}

export async function seedFromCsv(
  pool: Pool,
  tableName: string,
  filePath: string,
  options: SeedCsvOptions
): Promise<number> {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());

  const rawHeaders = lines[0]
    .replace(/"/g, "")
    .split(options.delimiter)
    .map((h) => h.trim().toLowerCase());

  let dataLines = lines.slice(1);
  if (options.limit && options.limit > 0) {
    dataLines = dataLines.slice(0, options.limit);
  }

  // Build column mapping: CSV index → SQL column name
  const columns: { csvIndex: number; sqlName: string }[] = [];
  rawHeaders.forEach((header, index) => {
    if (options.skipColumns?.includes(header)) return;
    const sqlName = options.columnMap?.[header] || header;
    columns.push({ csvIndex: index, sqlName });
  });

  const columnList = columns.map((c) => `"${c.sqlName}"`).join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const conflict = options.onConflict
    ? ` ON CONFLICT ${options.onConflict}`
    : "";
  const query = `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})${conflict}`;

  let inserted = 0;
  const batchSize = 100;

  for (let i = 0; i < dataLines.length; i += batchSize) {
    const batch = dataLines.slice(i, i + batchSize);

    for (const line of batch) {
      const rawValues = line.replace(/"/g, "").split(options.delimiter);

      const params = columns.map(({ csvIndex }) => {
        let val = rawValues[csvIndex]?.trim();
        if (!val || val === "None" || val === "none" || val === "") return null;
        if (options.decimalComma) val = val.replace(/,/g, ".");
        if (val === "True" || val === "true") return true;
        if (val === "False" || val === "false") return false;
        // Handle PostgreSQL array syntax: [val1, val2] → {val1,val2}
        if (val.startsWith("[") && val.endsWith("]")) {
          return "{" + val.slice(1, -1) + "}";
        }
        return val;
      });

      try {
        await pool.query(query, params);
        inserted++;
      } catch (err) {
        // Log first error per table, continue
        if (inserted === 0) {
          console.error(`  Error in ${tableName}: ${(err as Error).message}`);
        }
      }
    }
  }

  return inserted;
}

export function resolveDataPath(relativePath: string): string {
  // Data files are relative to the repo root (6 levels up from seeds/)
  return resolve(__dirname, "../../../../../..", relativePath);
}
