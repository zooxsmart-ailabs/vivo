-- =============================================================================
-- Migration 0009: Fix city assignment for municipalities around Goiânia
--
-- Problem: All geohash_cell rows were inserted with city = 'Goiânia' in
--   migration 0005, regardless of their actual geographic position. This
--   prevents filtering by Aparecida de Goiânia, Senador Canedo, Trindade
--   and Goianira.
--
-- Fix: Reassign city based on center_lat / center_lng bounding boxes.
--   Bounding boxes are approximate — refine if needed after visual inspection.
--
-- Municipality approximate centers:
--   Goiânia:              -16.6869, -49.2648
--   Aparecida de Goiânia: -16.8280, -49.2447  (south)
--   Senador Canedo:       -16.7056, -48.9922  (east)
--   Trindade:             -16.6499, -49.4884  (west)
--   Goianira:             -16.4978, -49.4265  (northwest)
-- =============================================================================

UPDATE geohash_cell
SET city = CASE
    -- Aparecida de Goiânia: south of Goiânia
    WHEN center_lat  <  -16.77
         AND center_lat  >  -16.97
         AND center_lng BETWEEN -49.40 AND -49.17
    THEN 'Aparecida de Goiânia'

    -- Senador Canedo: east of Goiânia
    WHEN center_lat BETWEEN -16.80 AND -16.62
         AND center_lng BETWEEN -49.14 AND -48.87
    THEN 'Senador Canedo'

    -- Trindade: west of Goiânia
    WHEN center_lat BETWEEN -16.75 AND -16.55
         AND center_lng  <  -49.43
    THEN 'Trindade'

    -- Goianira: northwest of Goiânia
    WHEN center_lat BETWEEN -16.60 AND -16.39
         AND center_lng BETWEEN -49.62 AND -49.36
    THEN 'Goianira'

    -- Everything else keeps existing value (Goiânia core)
    ELSE city
END
WHERE state = 'GO'
  AND city = 'Goiânia';
