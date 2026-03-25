# UC006 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC006-main-flow.md)

## RN006-01 — Periodos Disponiveis

| Campo | Valor |
|-------|-------|
| **ID** | RN006-01 |
| **Tipo** | Derivacao |
| **Passos** | Passo 2 |

**Descricao:**
O seletor exibe apenas meses para os quais existem dados no banco. A query:

```sql
SELECT DISTINCT DATE_TRUNC('month', ts_result) AS mes
FROM file_transfer
ORDER BY mes DESC
```

Meses sem dados sao desabilitados no picker. O periodo default e os ultimos 3 meses com dados.

---

## RN006-02 — Validacao de Intervalo

| Campo | Valor |
|-------|-------|
| **ID** | RN006-02 |
| **Tipo** | Validacao |
| **Passos** | Passo 4 |

**Descricao:**
- Intervalo maximo: 12 meses (limitacao de performance)
- Intervalo minimo: 1 mes
- Data fim >= Data inicio
- Ambas as datas devem estar no conjunto de meses disponiveis (RN006-01)

**Exemplo:**
- Valido: Jan 2026 — Mar 2026 (3 meses)
- Invalido: Jan 2026 — Mar 2027 (> 12 meses)

---

## RN006-03 — Impacto Global do Periodo

| Campo | Valor |
|-------|-------|
| **ID** | RN006-03 |
| **Tipo** | Derivacao |
| **Passos** | Passo 6 |

**Descricao:**
A mudanca de periodo afeta TODAS as abas simultaneamente:

| Aba | Impacto |
|-----|---------|
| Mapa Estrategico | Poligonos recalculados para o periodo |
| Frentes Estrategicas | Rankings e KPIs recalculados |
| Visao por Bairro | Agregacoes por bairro recalculadas |

Os benchmarks tambem sao recalculados para o periodo selecionado.
