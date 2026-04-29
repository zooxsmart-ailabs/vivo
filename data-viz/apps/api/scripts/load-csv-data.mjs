#!/usr/bin/env node
// =============================================================================
// Carrega cobertura_ftth_movel.csv -> vivo_coverage
//        geo_por_latlong_GO.csv  -> geo_por_latlong
//
// Usa INSERT em lote (1000 linhas/statement) via parametros pg. Streaming linha
// a linha pra nao carregar 147k linhas em memoria. TRUNCATE antes de inserir
// (idempotente). Roda dentro de uma transacao por arquivo.
//
// Uso:
//   pnpm --filter @vivo/zoox-map-api db:load-csv
//   pnpm --filter @vivo/zoox-map-api db:load-csv -- --only=coverage
//   pnpm --filter @vivo/zoox-map-api db:load-csv -- --only=geo
// =============================================================================

import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
const COVERAGE_CSV = resolve(REPO_ROOT, "cobertura_ftth_movel.csv");
const GEO_CSV = resolve(REPO_ROOT, "geo_por_latlong_GO.csv");

const BATCH_SIZE = 1000;

const args = new Set(process.argv.slice(2));
const only = [...args].find((a) => a.startsWith("--only="))?.split("=")[1];

function parseFlag(v) {
  if (v === "1" || v === "true" || v === "True") return true;
  if (v === "0" || v === "false" || v === "False" || v === "" || v == null)
    return false;
  return null;
}

function parseFloatOrNull(v) {
  if (v == null) return null;
  const trimmed = v.trim();
  if (
    trimmed === "" ||
    trimmed === "None" ||
    trimmed === "none" ||
    trimmed === "NULL"
  )
    return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(v) {
  if (v == null) return null;
  const trimmed = v.trim();
  if (trimmed === "" || trimmed === "None" || trimmed === "NULL") return null;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

function unquote(s) {
  if (s == null) return s;
  let v = s.trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  return v;
}

// CSV simples: comma sem quotes (cobertura_ftth_movel.csv).
function splitCommaCsv(line) {
  return line.split(",");
}

// CSV com ; e quotes (geo_por_latlong_GO.csv). Quotes envolvem strings.
function splitSemicolonCsv(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQ = !inQ;
      continue;
    }
    if (ch === ";" && !inQ) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

async function bulkInsert(pool, table, columns, rows) {
  if (rows.length === 0) return 0;
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const placeholders = rows
    .map((_, rowIdx) => {
      const offset = rowIdx * columns.length;
      return (
        "(" +
        columns.map((_, i) => `$${offset + i + 1}`).join(", ") +
        ")"
      );
    })
    .join(", ");
  const params = rows.flat();
  await pool.query(
    `INSERT INTO ${table} (${colList}) VALUES ${placeholders}`,
    params
  );
  return rows.length;
}

async function loadCoverage(pool) {
  console.log(`[coverage] reading ${COVERAGE_CSV}`);
  await pool.query("TRUNCATE TABLE vivo_coverage");

  const columns = ["latitude", "longitude", "flg_fibra", "flg_4g", "flg_5g"];
  const lines = readFileSync(COVERAGE_CSV, "utf-8").split("\n");

  const header = splitCommaCsv(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = {
    latitude: header.indexOf("latitude"),
    longitude: header.indexOf("longitude"),
    flg_fibra: header.indexOf("flg_ftth"),
    flg_4g: header.indexOf("flg_4g_bso"),
    flg_5g: header.indexOf("flg_5g_bso"),
  };
  for (const [k, v] of Object.entries(idx)) {
    if (v < 0)
      throw new Error(`coverage CSV: coluna esperada nao encontrada (${k})`);
  }

  let batch = [];
  let total = 0;
  const t0 = Date.now();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const fields = splitCommaCsv(line);
    batch.push([
      parseFloatOrNull(fields[idx.latitude]),
      parseFloatOrNull(fields[idx.longitude]),
      parseFlag(fields[idx.flg_fibra]?.trim()),
      parseFlag(fields[idx.flg_4g]?.trim()),
      parseFlag(fields[idx.flg_5g]?.trim()),
    ]);
    if (batch.length >= BATCH_SIZE) {
      total += await bulkInsert(pool, "vivo_coverage", columns, batch);
      batch = [];
      if (total % 20000 === 0) console.log(`[coverage] ${total} linhas...`);
    }
  }
  if (batch.length > 0)
    total += await bulkInsert(pool, "vivo_coverage", columns, batch);

  console.log(`[coverage] OK: ${total} linhas em ${Date.now() - t0}ms`);
  return total;
}

// CSV usa virgula decimal pra numeros. Strategy: trocar UMA virgula entre
// digitos por ponto (a virgula tambem e separador de milhar nao aparece aqui).
function decimalCommaToDot(s) {
  if (s == null) return s;
  const v = s.trim();
  if (v === "") return v;
  // exatamente uma virgula em meio a digitos -> trocar por ponto.
  return v.replace(/,/g, ".");
}

async function loadGeo(pool) {
  console.log(`[geo] reading ${GEO_CSV}`);
  // 0029 ja faz TRUNCATE, mas re-rodar o loader sem migration deve limpar.
  await pool.query("TRUNCATE TABLE geo_por_latlong");

  // Nome do CSV -> nome da coluna SQL. CSV tem geohash6 (nao usado: e GENERATED).
  const csvToSql = {
    id_municipio: "id_municipio",
    nm_municipio: "nm_municipio",
    nm_bairro: "nm_bairro",
    situacao_setor: "situacao_setor",
    perfil_setor: "perfil_setor",
    latitude: "latitude",
    longitude: "longitude",
    populacao_total_media: "populacao_total_media",
    total_de_rendimento_media: "total_de_rendimento_media",
    despesa_total_media_x: "despesa_total_media_x",
    gastos_pacote_3play_media: "gastos_pacote_3play_media",
    populacao_diurna_media: "populacao_diurna_media",
    total_de_domicilios_media: "total_de_domicilios_media",
    domicilios_class_a_media: "domicilios_class_a_media",
    domicilios_class_b1_media: "domicilios_class_b1_media",
    domicilios_class_b2_media: "domicilios_class_b2_media",
    domicilios_class_c1_media: "domicilios_class_c1_media",
    domicilios_class_c2_media: "domicilios_class_c2_media",
    domicilios_class_e_d_media: "domicilios_class_e_d_media",
    pessoas_sem_rendimento_media: "pessoas_sem_rendimento_media",
    "pessoas_de_1/2_a_1_salario_media": "pessoas_de_meio_a_1_salario_media",
    pessoas_de_1_a_2_salarios_media: "pessoas_de_1_a_2_salarios_media",
    pessoas_de_2_a_3_salarios_media: "pessoas_de_2_a_3_salarios_media",
    pessoas_de_3_a_5_salarios_media: "pessoas_de_3_a_5_salarios_media",
    pessoas_de_5_a_10_salarios_media: "pessoas_de_5_a_10_salarios_media",
    pessoas_de_10_a_15_salarios_media: "pessoas_de_10_a_15_salarios_media",
    pessoas_de_15_a_20_salarios_media: "pessoas_de_15_a_20_salarios_media",
    pessoas_mais_de_20_salarios_media: "pessoas_mais_de_20_salarios_media",
    renda_per_capita_media: "renda_per_capita_media",
    gastos_pacote_3play_por_domicilio_media:
      "gastos_pacote_3play_por_domicilio_media",
    populacao_total_por_domicilio_media: "populacao_total_por_domicilio_media",
    total_de_rendimento_por_domicilio_media:
      "total_de_rendimento_por_domicilio_media",
    despesa_total_media_y: "despesa_total_media_y",
    despesa_total_por_domicilio_media: "despesa_total_por_domicilio_media",
    grau_de_endividamento_media: "grau_de_endividamento_media",
    grau_de_endividamento_por_domicilio_media:
      "grau_de_endividamento_por_domicilio_media",
  };

  // Colunas inteiras x reais.
  const intCols = new Set(["id_municipio", "perfil_setor"]);
  // text cols: tudo que nao e numerico.
  const textCols = new Set([
    "nm_municipio",
    "nm_bairro",
    "situacao_setor",
  ]);

  const lines = readFileSync(GEO_CSV, "utf-8").split("\n");
  const header = splitSemicolonCsv(lines[0]).map((h) =>
    unquote(h).toLowerCase()
  );

  /** @type {{csvIdx: number, sqlCol: string, kind: "int"|"text"|"float"}[]} */
  const mapping = [];
  for (const [csvName, sqlCol] of Object.entries(csvToSql)) {
    const csvIdx = header.indexOf(csvName.toLowerCase());
    if (csvIdx < 0)
      throw new Error(`geo CSV: coluna esperada nao encontrada (${csvName})`);
    const kind = intCols.has(sqlCol)
      ? "int"
      : textCols.has(sqlCol)
        ? "text"
        : "float";
    mapping.push({ csvIdx, sqlCol, kind });
  }
  const columns = mapping.map((m) => m.sqlCol);

  let batch = [];
  let total = 0;
  const t0 = Date.now();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const fields = splitSemicolonCsv(line);
    const row = mapping.map(({ csvIdx, kind }) => {
      const raw = unquote(fields[csvIdx] ?? "");
      if (kind === "text") return raw === "" ? null : raw;
      if (kind === "int") return parseIntOrNull(raw);
      return parseFloatOrNull(decimalCommaToDot(raw));
    });
    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      total += await bulkInsert(pool, "geo_por_latlong", columns, batch);
      batch = [];
    }
  }
  if (batch.length > 0)
    total += await bulkInsert(pool, "geo_por_latlong", columns, batch);

  console.log(`[geo] OK: ${total} linhas em ${Date.now() - t0}ms`);
  return total;
}

async function main() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    user: process.env.DATABASE_USER || "vivo",
    password: process.env.DATABASE_PASSWORD || "changeme",
    database: process.env.DATABASE_NAME || "vivo_geointel",
    statement_timeout: 600_000,
  });

  try {
    if (!only || only === "coverage") await loadCoverage(pool);
    if (!only || only === "geo") await loadGeo(pool);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
