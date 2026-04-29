-- =============================================================================
-- Migration 0028: tabela vivo_coverage (cobertura FTTH/4G/5G por ponto).
--
-- Insere lat/long + flags (FTTH, 4G, 5G) e materializa geom/geohash6/geohash7
-- via GENERATED ALWAYS ... STORED. Indexes mirror o que ja existe em
-- geo_por_latlong / vivo_ftth_coverage para acelerar joins por geohash6.
-- =============================================================================

CREATE TABLE IF NOT EXISTS "vivo_coverage" (
    "latitude" double precision,
    "longitude" double precision,
    "flg_fibra" boolean DEFAULT false NOT NULL,
    "flg_4g" boolean DEFAULT false NOT NULL,
    "flg_5g" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE vivo_coverage
    ADD COLUMN IF NOT EXISTS geom geometry(point, 4326)
      GENERATED ALWAYS AS (st_setsrid(st_makepoint(longitude, latitude), 4326)) STORED,
    ADD COLUMN IF NOT EXISTS geohash7 text
      GENERATED ALWAYS AS (st_geohash(st_setsrid(st_makepoint(longitude, latitude), 4326), 7)) STORED,
    ADD COLUMN IF NOT EXISTS geohash6 text
      GENERATED ALWAYS AS (st_geohash(st_setsrid(st_makepoint(longitude, latitude), 4326), 6)) STORED;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_vivo_coverage_geohash6
    ON vivo_coverage USING btree (geohash6) INCLUDE (flg_fibra, flg_4g, flg_5g);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_vivo_coverage_geom
    ON vivo_coverage USING gist (geom);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_vivo_coverage_lat
    ON vivo_coverage USING btree (latitude);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_vivo_coverage_lon
    ON vivo_coverage USING btree (longitude);
