import { Pool } from "pg";

/**
 * Popula geohash_cell a partir dos geohashes distintos existentes
 * nas tabelas geo_por_latlong e score.
 *
 * geo_por_latlong fornece coordenadas reais; geohashes encontrados
 * apenas no score recebem coordenadas fallback (centro de Goiânia).
 */
export async function seedGeohashCell(pool: Pool): Promise<void> {
  console.log("Seeding geohash_cell...");

  // Precision 7 — from geo_por_latlong (real coords)
  const gh7Geo = await pool.query(`
    INSERT INTO geohash_cell (geohash_id, precision, center_lat, center_lng, city, state, created_at)
    SELECT
      geohash7, 7::SMALLINT, AVG(latitude), AVG(longitude),
      'Goiânia', 'GO', NOW()
    FROM geo_por_latlong
    WHERE geohash7 IS NOT NULL
    GROUP BY geohash7
    ON CONFLICT (geohash_id) DO NOTHING
  `);

  // Precision 6 — from geo_por_latlong
  const gh6Geo = await pool.query(`
    INSERT INTO geohash_cell (geohash_id, precision, center_lat, center_lng, city, state, created_at)
    SELECT
      geohash6, 6::SMALLINT, AVG(latitude), AVG(longitude),
      'Goiânia', 'GO', NOW()
    FROM geo_por_latlong
    WHERE geohash6 IS NOT NULL
    GROUP BY geohash6
    ON CONFLICT (geohash_id) DO NOTHING
  `);

  // Precision 7 — from file_transfer (real coords from Ookla tests)
  const gh7Score = await pool.query(`
    INSERT INTO geohash_cell (geohash_id, precision, center_lat, center_lng, city, state, created_at)
    SELECT DISTINCT ON (attr_geohash7)
      attr_geohash7, 7::SMALLINT,
      AVG(attr_location_latitude) OVER (PARTITION BY attr_geohash7),
      AVG(attr_location_longitude) OVER (PARTITION BY attr_geohash7),
      'Goiânia', 'GO', NOW()
    FROM file_transfer
    WHERE attr_geohash7 IS NOT NULL
      AND attr_location_latitude IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM geohash_cell WHERE geohash_id = attr_geohash7)
    ON CONFLICT (geohash_id) DO NOTHING
  `);

  // Precision 6 — from file_transfer (real coords from Ookla tests)
  const gh6Score = await pool.query(`
    INSERT INTO geohash_cell (geohash_id, precision, center_lat, center_lng, city, state, created_at)
    SELECT DISTINCT ON (attr_geohash6)
      attr_geohash6, 6::SMALLINT,
      AVG(attr_location_latitude) OVER (PARTITION BY attr_geohash6),
      AVG(attr_location_longitude) OVER (PARTITION BY attr_geohash6),
      'Goiânia', 'GO', NOW()
    FROM file_transfer
    WHERE attr_geohash6 IS NOT NULL
      AND attr_location_latitude IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM geohash_cell WHERE geohash_id = attr_geohash6)
    ON CONFLICT (geohash_id) DO NOTHING
  `);

  const total =
    gh7Geo.rowCount! + gh6Geo.rowCount! + gh7Score.rowCount! + gh6Score.rowCount!;
  console.log(`  Inserted ${total} geohash_cell rows (${gh7Geo.rowCount} + ${gh6Geo.rowCount} geo, ${gh7Score.rowCount} + ${gh6Score.rowCount} score-only)`);

  // Refresh materialized view after populating geohash_cell
  console.log("  Refreshing vw_geohash_summary...");
  await pool.query(
    "REFRESH MATERIALIZED VIEW CONCURRENTLY vw_geohash_summary",
  );
  console.log("  Materialized view refreshed");
}
