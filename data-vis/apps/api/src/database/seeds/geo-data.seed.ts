import { Pool } from "pg";
import { seedFromCsv, resolveDataPath } from "./utils";

export async function seedGeoData(pool: Pool): Promise<void> {
  // geo_por_latlong (3093 rows, semicolon, comma decimals, quoted headers)
  // "geom" and "geohash7" are generated columns in SQL — but the CSV
  // does not contain them, so no skipColumns needed.
  console.log("Seeding geo_por_latlong...");
  const geoCount = await seedFromCsv(
    pool,
    "geo_por_latlong",
    resolveDataPath("estudo/geo_por_latlong_GO_v2.csv"),
    {
      delimiter: ";",
      decimalComma: true,
    }
  );
  console.log(`  Inserted ${geoCount} geo_por_latlong rows`);

  // vivo_ftth_coverage (semicolon, comma decimals, quoted headers)
  // "geom", "geohash7", "geohash6" are GENERATED ALWAYS columns — must skip.
  // CSV does not include them, so no skipColumns needed.
  // Limit to first 5000 rows for seed.
  console.log("Seeding vivo_ftth_coverage (sample)...");
  const ftthCount = await seedFromCsv(
    pool,
    "vivo_ftth_coverage",
    resolveDataPath("docs/levantamento/Ookla_visao_ftth_3M_202512.csv"),
    {
      delimiter: ";",
      decimalComma: true,
      limit: 5000,
      onConflict: "(cod_geo, anomes) DO NOTHING",
    }
  );
  console.log(`  Inserted ${ftthCount} vivo_ftth_coverage rows`);

  // vivo_mobile_erb (semicolon, uppercase headers, ~994 rows)
  // "geom", "geohash7", "geohash6" are GENERATED ALWAYS — CSV doesn't have them.
  console.log("Seeding vivo_mobile_erb...");
  const erbCount = await seedFromCsv(
    pool,
    "vivo_mobile_erb",
    resolveDataPath(
      "docs/levantamento/Ookla_visao_movel_3M_erb_casa_202512.csv"
    ),
    {
      delimiter: ";",
      onConflict: "(erb_casa, anomes) DO NOTHING",
    }
  );
  console.log(`  Inserted ${erbCount} vivo_mobile_erb rows`);
}
