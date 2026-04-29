-- =============================================================================
-- Migration 0029: reshape geo_por_latlong para a nova fonte (geo_por_latlong_GO.csv).
--
-- - TRUNCATE: dados atuais sao descartados (decisao do produto).
-- - DROP COLUMN: remove campos de gastos/propensao/trabalhadores que NAO estao
--   na nova fonte e que tambem NAO sao referenciados por nenhuma MV / view /
--   query do app (verificado por grep). Sem CASCADE para falhar visivelmente
--   caso alguma view nova passe a depender deles.
-- - ADD COLUMN: novos campos da fonte (municipio/bairro/setor + breakdown de
--   classes sociais, salarios e despesas). Slash em "pessoas_de_1/2_a_1_..."
--   foi normalizado para "pessoas_de_meio_a_1_salario_media" (slash em ident.
--   SQL exigiria quoting permanente).
-- - geom / geohash7 / geohash6 sao GENERATED ALWAYS e ja existem (criadas em
--   drizzle/custom/timescale-setup.sql). Os indexes sobre essas colunas
--   permanecem intactos.
-- =============================================================================

TRUNCATE TABLE geo_por_latlong;--> statement-breakpoint

ALTER TABLE geo_por_latlong
    DROP COLUMN IF EXISTS total_trabalhadores_media,
    DROP COLUMN IF EXISTS gastos_habitacao_dom_media,
    DROP COLUMN IF EXISTS gastos_transporte_dom_media,
    DROP COLUMN IF EXISTS gastos_saude_dom_media,
    DROP COLUMN IF EXISTS gastos_educacao_dom_media,
    DROP COLUMN IF EXISTS gastos_higiene_e_cuidados_pessoais_dom_media,
    DROP COLUMN IF EXISTS gastos_alimentacao_dom_media,
    DROP COLUMN IF EXISTS gastos_telefone_fixo_dom_media,
    DROP COLUMN IF EXISTS gastos_telefone_celular_dom_media,
    DROP COLUMN IF EXISTS gastos_pacote_3play_dom_media,
    DROP COLUMN IF EXISTS gastos_comunicacao_dom_media,
    DROP COLUMN IF EXISTS gastos_recreacao_e_cultura_dom_media,
    DROP COLUMN IF EXISTS gastos_viagens_dom_media,
    DROP COLUMN IF EXISTS propensao_seguro_saude_media,
    DROP COLUMN IF EXISTS propensao_seguro_vida_media,
    DROP COLUMN IF EXISTS propensao_seguro_residencial_media;
--> statement-breakpoint

ALTER TABLE geo_por_latlong
    ADD COLUMN IF NOT EXISTS id_municipio integer,
    ADD COLUMN IF NOT EXISTS nm_municipio text,
    ADD COLUMN IF NOT EXISTS nm_bairro text,
    ADD COLUMN IF NOT EXISTS situacao_setor text,
    ADD COLUMN IF NOT EXISTS perfil_setor smallint,
    ADD COLUMN IF NOT EXISTS total_de_rendimento_media double precision,
    ADD COLUMN IF NOT EXISTS despesa_total_media_x double precision,
    ADD COLUMN IF NOT EXISTS gastos_pacote_3play_media double precision,
    ADD COLUMN IF NOT EXISTS populacao_diurna_media double precision,
    ADD COLUMN IF NOT EXISTS domicilios_class_a_media double precision,
    ADD COLUMN IF NOT EXISTS domicilios_class_b1_media double precision,
    ADD COLUMN IF NOT EXISTS domicilios_class_b2_media double precision,
    ADD COLUMN IF NOT EXISTS domicilios_class_c1_media double precision,
    ADD COLUMN IF NOT EXISTS domicilios_class_c2_media double precision,
    ADD COLUMN IF NOT EXISTS domicilios_class_e_d_media double precision,
    ADD COLUMN IF NOT EXISTS pessoas_sem_rendimento_media double precision,
    ADD COLUMN IF NOT EXISTS pessoas_de_meio_a_1_salario_media double precision,
    ADD COLUMN IF NOT EXISTS pessoas_de_1_a_2_salarios_media double precision,
    ADD COLUMN IF NOT EXISTS pessoas_de_2_a_3_salarios_media double precision,
    ADD COLUMN IF NOT EXISTS pessoas_de_3_a_5_salarios_media double precision,
    ADD COLUMN IF NOT EXISTS pessoas_de_5_a_10_salarios_media double precision,
    ADD COLUMN IF NOT EXISTS pessoas_de_10_a_15_salarios_media double precision,
    ADD COLUMN IF NOT EXISTS pessoas_de_15_a_20_salarios_media double precision,
    ADD COLUMN IF NOT EXISTS pessoas_mais_de_20_salarios_media double precision,
    ADD COLUMN IF NOT EXISTS gastos_pacote_3play_por_domicilio_media double precision,
    ADD COLUMN IF NOT EXISTS populacao_total_por_domicilio_media double precision,
    ADD COLUMN IF NOT EXISTS total_de_rendimento_por_domicilio_media double precision,
    ADD COLUMN IF NOT EXISTS despesa_total_media_y double precision,
    ADD COLUMN IF NOT EXISTS despesa_total_por_domicilio_media double precision,
    ADD COLUMN IF NOT EXISTS grau_de_endividamento_media double precision,
    ADD COLUMN IF NOT EXISTS grau_de_endividamento_por_domicilio_media double precision;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_geo_por_latlong_municipio
    ON geo_por_latlong (id_municipio);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_geo_por_latlong_bairro
    ON geo_por_latlong (nm_municipio, nm_bairro);
