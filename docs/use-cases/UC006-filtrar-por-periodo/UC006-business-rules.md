# UC006 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC006-main-flow.md)

## RN006-01 — Períodos Disponíveis

| Campo | Valor |
|-------|-------|
| **ID** | RN006-01 |
| **Tipo** | Derivação |
| **Passos** | Passo 2 |

**Descrição:**
O seletor exibe apenas meses para os quais existem dados no banco. A query:

```sql
SELECT DISTINCT DATE_TRUNC('month', ts_result) AS mes
FROM file_transfer
ORDER BY mes DESC
```

Meses sem dados sao desabilitados no picker. O período default e os ultimos 3 meses com dados.

---

## RN006-02 — Validação de Intervalo

| Campo | Valor |
|-------|-------|
| **ID** | RN006-02 |
| **Tipo** | Validação |
| **Passos** | Passo 4 |

**Descrição:**
- Intervalo máximo: 12 meses (limitação de performance)
- Intervalo mínimo: 1 mes
- Data fim >= Data inicio
- Ambas as datas devem estar no conjunto de meses disponíveis (RN006-01)

**Exemplo:**
- Valido: Jan 2026 — Mar 2026 (3 meses)
- Invalido: Jan 2026 — Mar 2027 (> 12 meses)

---

## RN006-03 — Impacto Global do Período

| Campo | Valor |
|-------|-------|
| **ID** | RN006-03 |
| **Tipo** | Derivação |
| **Passos** | Passo 6 |

**Descrição:**
A mudança de período afeta TODAS as abas simultaneamente:

| Aba | Impacto |
|-----|---------|
| Mapa Estratégico | Poligonos recalculados para o período |
| Frentes Estratégicas | Rankings e KPIs recalculados |
| Visão por Bairro | Agregacoes por bairro recalculadas |

Os benchmarks tambem sao recalculados para o período selecionado.
