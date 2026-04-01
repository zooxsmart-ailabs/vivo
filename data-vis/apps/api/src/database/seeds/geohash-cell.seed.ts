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

  // Precision 7 — score-only geohashes (fallback coords)
  const gh7Score = await pool.query(`
    INSERT INTO geohash_cell (geohash_id, precision, center_lat, center_lng, city, state, created_at)
    SELECT DISTINCT
      cd_geo_hsh7, 7::SMALLINT, -16.6869, -49.2648,
      'Goiânia', 'GO', NOW()
    FROM score
    WHERE cd_geo_hsh7 IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM geohash_cell WHERE geohash_id = cd_geo_hsh7)
    ON CONFLICT (geohash_id) DO NOTHING
  `);

  // Precision 6 — score-only geohashes (fallback coords)
  const gh6Score = await pool.query(`
    INSERT INTO geohash_cell (geohash_id, precision, center_lat, center_lng, city, state, created_at)
    SELECT DISTINCT
      LEFT(cd_geo_hsh7, 6), 6::SMALLINT, -16.6869, -49.2648,
      'Goiânia', 'GO', NOW()
    FROM score
    WHERE cd_geo_hsh7 IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM geohash_cell WHERE geohash_id = LEFT(cd_geo_hsh7, 6))
    ON CONFLICT (geohash_id) DO NOTHING
  `);

  const total =
    gh7Geo.rowCount! + gh6Geo.rowCount! + gh7Score.rowCount! + gh6Score.rowCount!;
  console.log(`  Inserted ${total} geohash_cell rows (${gh7Geo.rowCount} + ${gh6Geo.rowCount} geo, ${gh7Score.rowCount} + ${gh6Score.rowCount} score-only)`);
}
