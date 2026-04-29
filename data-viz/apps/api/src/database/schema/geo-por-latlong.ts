import {
  pgTable,
  doublePrecision,
  integer,
  smallint,
  text,
} from "drizzle-orm/pg-core";

export const geoPorLatlong = pgTable("geo_por_latlong", {
  idMunicipio: integer("id_municipio"),
  nmMunicipio: text("nm_municipio"),
  nmBairro: text("nm_bairro"),
  situacaoSetor: text("situacao_setor"),
  perfilSetor: smallint("perfil_setor"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  populacaoTotalMedia: doublePrecision("populacao_total_media"),
  totalDeRendimentoMedia: doublePrecision("total_de_rendimento_media"),
  despesaTotalMediaX: doublePrecision("despesa_total_media_x"),
  gastosPacote3playMedia: doublePrecision("gastos_pacote_3play_media"),
  populacaoDiurnaMedia: doublePrecision("populacao_diurna_media"),
  totalDeDomiciliosMedia: doublePrecision("total_de_domicilios_media"),
  domiciliosClassAMedia: doublePrecision("domicilios_class_a_media"),
  domiciliosClassB1Media: doublePrecision("domicilios_class_b1_media"),
  domiciliosClassB2Media: doublePrecision("domicilios_class_b2_media"),
  domiciliosClassC1Media: doublePrecision("domicilios_class_c1_media"),
  domiciliosClassC2Media: doublePrecision("domicilios_class_c2_media"),
  domiciliosClassEDMedia: doublePrecision("domicilios_class_e_d_media"),
  pessoasSemRendimentoMedia: doublePrecision("pessoas_sem_rendimento_media"),
  // CSV original: "pessoas_de_1/2_a_1_salario_media" — slash normalizado.
  pessoasDeMeioA1SalarioMedia: doublePrecision(
    "pessoas_de_meio_a_1_salario_media"
  ),
  pessoasDe1A2SalariosMedia: doublePrecision("pessoas_de_1_a_2_salarios_media"),
  pessoasDe2A3SalariosMedia: doublePrecision("pessoas_de_2_a_3_salarios_media"),
  pessoasDe3A5SalariosMedia: doublePrecision("pessoas_de_3_a_5_salarios_media"),
  pessoasDe5A10SalariosMedia: doublePrecision(
    "pessoas_de_5_a_10_salarios_media"
  ),
  pessoasDe10A15SalariosMedia: doublePrecision(
    "pessoas_de_10_a_15_salarios_media"
  ),
  pessoasDe15A20SalariosMedia: doublePrecision(
    "pessoas_de_15_a_20_salarios_media"
  ),
  pessoasMaisDe20SalariosMedia: doublePrecision(
    "pessoas_mais_de_20_salarios_media"
  ),
  rendaPerCapitaMedia: doublePrecision("renda_per_capita_media"),
  gastosPacote3playPorDomicilioMedia: doublePrecision(
    "gastos_pacote_3play_por_domicilio_media"
  ),
  populacaoTotalPorDomicilioMedia: doublePrecision(
    "populacao_total_por_domicilio_media"
  ),
  totalDeRendimentoPorDomicilioMedia: doublePrecision(
    "total_de_rendimento_por_domicilio_media"
  ),
  despesaTotalMediaY: doublePrecision("despesa_total_media_y"),
  despesaTotalPorDomicilioMedia: doublePrecision(
    "despesa_total_por_domicilio_media"
  ),
  grauDeEndividamentoMedia: doublePrecision("grau_de_endividamento_media"),
  grauDeEndividamentoPorDomicilioMedia: doublePrecision(
    "grau_de_endividamento_por_domicilio_media"
  ),
  // geom, geohash7, geohash6 are GENERATED ALWAYS columns — skipped
});
