-- =============================================================================
-- Cleanup de duplicatas em (guid_result, ts_result) nas 3 hypertables QoE
-- (file_transfer, video, web_browsing).
--
-- Pré-requisito da migration 0027 (que cria UNIQUE INDEX nessas colunas).
--
-- Estratégia: para cada conjunto de linhas com mesma (guid_result, ts_result)
-- e guid_result NOT NULL, mantém apenas a primeira ocorrência (MIN(ctid)).
-- Confiável em hypertables Timescale porque rows com mesmo ts_result vivem
-- no mesmo chunk físico, então ctid é comparável.
--
-- COMO EXECUTAR (em sessão psql, não Drizzle):
--
--   1. Inspecione com a query de diagnóstico no README:
--      SELECT 'file_transfer', COUNT(*), COUNT(DISTINCT (guid_result, ts_result))
--        FROM file_transfer ...
--
--   2. Rode este script DENTRO DE TRANSACTION explícita por tabela:
--      \c vivo
--      BEGIN;
--      <comandos abaixo, uma tabela de cada vez>
--      -- inspecione contagem
--      COMMIT;  -- só se OK
--
-- DESEMPENHO: cada DELETE faz scan completo da tabela. Em file_transfer com
-- 32M+ rows, espere alguns minutos (depende do hardware). Considere rodar
-- fora de horário comercial. Tabela fica com lock RowExclusive durante o
-- DELETE — leituras seguem funcionando, escritas concorrentes esperam.
-- =============================================================================

-- file_transfer
WITH ranked AS (
  SELECT ctid, ts_result, guid_result,
         ROW_NUMBER() OVER (
           PARTITION BY guid_result, ts_result
           ORDER BY ctid
         ) AS rn
    FROM file_transfer
   WHERE guid_result IS NOT NULL
)
DELETE FROM file_transfer ft
 USING ranked r
 WHERE ft.ctid = r.ctid
   AND ft.ts_result = r.ts_result   -- ajuda Timescale a podar chunks
   AND r.rn > 1;

-- video
WITH ranked AS (
  SELECT ctid, ts_result, guid_result,
         ROW_NUMBER() OVER (
           PARTITION BY guid_result, ts_result
           ORDER BY ctid
         ) AS rn
    FROM video
   WHERE guid_result IS NOT NULL
)
DELETE FROM video v
 USING ranked r
 WHERE v.ctid = r.ctid
   AND v.ts_result = r.ts_result
   AND r.rn > 1;

-- web_browsing
WITH ranked AS (
  SELECT ctid, ts_result, guid_result,
         ROW_NUMBER() OVER (
           PARTITION BY guid_result, ts_result
           ORDER BY ctid
         ) AS rn
    FROM web_browsing
   WHERE guid_result IS NOT NULL
)
DELETE FROM web_browsing w
 USING ranked r
 WHERE w.ctid = r.ctid
   AND w.ts_result = r.ts_result
   AND r.rn > 1;

-- VACUUM ANALYZE recomendado depois para recuperar espaço e atualizar stats
-- (cada VACUUM separado, ANALYZE incluído):
--   VACUUM ANALYZE file_transfer;
--   VACUUM ANALYZE video;
--   VACUUM ANALYZE web_browsing;
