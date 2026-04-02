import { pgTable, doublePrecision } from "drizzle-orm/pg-core";

export const geoPorLatlong = pgTable("geo_por_latlong", {
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  populacaoTotalMedia: doublePrecision("populacao_total_media"),
  totalDeDomiciliosMedia: doublePrecision("total_de_domicilios_media"),
  totalTrabalhadoresMedia: doublePrecision("total_trabalhadores_media"),
  rendaPerCapitaMedia: doublePrecision("renda_per_capita_media"),
  gastosHabitacaoDomMedia: doublePrecision("gastos_habitacao_dom_media"),
  gastosTransporteDomMedia: doublePrecision("gastos_transporte_dom_media"),
  gastosSaudeDomMedia: doublePrecision("gastos_saude_dom_media"),
  gastosEducacaoDomMedia: doublePrecision("gastos_educacao_dom_media"),
  gastosHigieneECuidadosPessoaisDomMedia: doublePrecision(
    "gastos_higiene_e_cuidados_pessoais_dom_media"
  ),
  gastosAlimentacaoDomMedia: doublePrecision("gastos_alimentacao_dom_media"),
  gastosTelefoneFixoDomMedia: doublePrecision(
    "gastos_telefone_fixo_dom_media"
  ),
  gastosTelefoneCelularDomMedia: doublePrecision(
    "gastos_telefone_celular_dom_media"
  ),
  gastosPacote3playDomMedia: doublePrecision(
    "gastos_pacote_3play_dom_media"
  ),
  gastosComunicacaoDomMedia: doublePrecision(
    "gastos_comunicacao_dom_media"
  ),
  gastosRecreacaoECulturaDomMedia: doublePrecision(
    "gastos_recreacao_e_cultura_dom_media"
  ),
  gastosViagensDomMedia: doublePrecision("gastos_viagens_dom_media"),
  propensaoSeguroSaudeMedia: doublePrecision(
    "propensao_seguro_saude_media"
  ),
  propensaoSeguroVidaMedia: doublePrecision("propensao_seguro_vida_media"),
  propensaoSeguroResidencialMedia: doublePrecision(
    "propensao_seguro_residencial_media"
  ),
  // geom and geohash7 are GENERATED ALWAYS columns — skipped
});
