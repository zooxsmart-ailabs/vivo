import { Pool } from "pg";

const p = new Pool({
  host: process.env.DATABASE_HOST,
  port: +process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  statement_timeout: 600000,
});

const q = (s) => p.query(s).then((r) => r.rows);

try {
  console.log("--- 1. score_param seed ---");
  console.table(
    await q(`SELECT mode, percentile, COUNT(*) AS n
             FROM score_param WHERE valid_to IS NULL
             GROUP BY 1,2 ORDER BY 1,2`)
  );

  console.log("--- 2. fn_ookla_logistic_score smoke ---");
  console.table(
    await q(`SELECT
      fn_ookla_logistic_score(50,    3.932, 1.090, 0.56,   'a') AS down_50mbps_p50,
      fn_ookla_logistic_score(45,    6.580, 0.597, 0.0624, 'b') AS lat_dl_45ms_p50,
      fn_ookla_logistic_score(NULL,  3.932, 1.090, 0.56,   'a') AS null_input,
      fn_ookla_logistic_score(0,     3.932, 1.090, 0.56,   'a') AS zero_input`)
  );

  console.log("--- 3. MV network_performance_compatible status ---");
  console.table(
    await q(`SELECT COUNT(*)::int AS rows,
                    MIN(ts_result)::date AS min_date,
                    MAX(ts_result)::date AS max_date,
                    COUNT(*) FILTER (WHERE val_dl_latency_iqm IS NOT NULL)::int AS com_lat_dl,
                    COUNT(*) FILTER (WHERE val_ul_latency_iqm IS NOT NULL)::int AS com_lat_ul,
                    COUNT(DISTINCT data_source) AS sources
             FROM network_performance_compatible`)
  );

  console.log("--- 4. vw_qoe_unified breakdown ---");
  console.table(
    await q(`SELECT data_source, network_type, COUNT(*)::int AS rows
             FROM vw_qoe_unified
             GROUP BY 1,2 ORDER BY 1,2`)
  );

  console.log("--- 5. functions registered ---");
  console.table(
    await q(`SELECT proname FROM pg_proc
             WHERE proname LIKE 'fn_%ookla%' ORDER BY proname`)
  );

  console.log("--- 6. comparative views exist + cols ---");
  console.table(
    await q(`SELECT table_name, COUNT(*)::int AS n_columns
             FROM information_schema.columns
             WHERE table_name IN ('vw_score_comparativo_mobile','vw_score_comparativo_fibra',
                                  'vw_score_mobile','vw_score_fibra')
             GROUP BY table_name ORDER BY table_name`)
  );

  console.log(
    "--- 7. Pick a geohash with most Ookla testes and run consolidado ---"
  );
  const top = await q(`SELECT attr_geohash7 AS gh, COUNT(*)::int AS n
                       FROM network_performance_compatible
                       WHERE network_type = 'mobile' AND attr_geohash7 IS NOT NULL
                       GROUP BY 1 ORDER BY n DESC LIMIT 3`);
  console.table(top);

  if (top.length > 0) {
    const gh = top[0].gh;
    console.log(`Running fn_score_ookla_consolidado('mobile', '${gh}', NULL, 7)`);
    const res = await q(`SELECT geohash_id, period_month, operator,
                                ROUND(score_speed_pilar, 1) AS speed,
                                ROUND(score_video_pilar, 1) AS video,
                                ROUND(score_web_pilar,   1) AS web,
                                ROUND(score_conectividade, 1) AS final
                         FROM fn_score_ookla_consolidado('mobile', '${gh}', NULL, 7::smallint)
                         ORDER BY period_month DESC, operator LIMIT 5`);
    console.table(res);
  }

  console.log("--- 8. vw_score_comparativo_mobile sample ---");
  const cmp = await q(`SELECT geohash_id, period_month, operator,
                              vivo_composite_score, ookla_score_final, delta_metodos
                       FROM vw_score_comparativo_mobile
                       WHERE operator = 'VIVO'
                         AND vivo_composite_score IS NOT NULL
                         AND ookla_score_final IS NOT NULL
                       ORDER BY ABS(delta_metodos) DESC
                       LIMIT 5`);
  console.table(cmp);
} finally {
  await p.end();
}
