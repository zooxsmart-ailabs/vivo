# UC009 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC009-main-flow.md)

## RN009-01 — Configuracao de Fluxo por Estrategia

| Campo | Valor |
|-------|-------|
| **ID** | RN009-01 |
| **Tipo** | Derivacao |
| **Passos** | Passo 10 |

**Descricao:**
Cada estrategia possui configuracao fixa de fluxo (FLOW_CONFIG):

### RETENCAO (Vermelho #DC2626)
- **Contexto**: "Alta penetracao em area com qualidade tecnica comprometida"
- **Alerta**: "Risco Iminente de Churn"
- **Segmentos**: Premium 30%, Familia 50%, Basico 20%
- **Acoes**: Upgrade gratuito + Mesh + SLA Prioridade / Manutencao preventiva + upgrade temporario / Verificacao tecnica + 15% desconto

### UPSELL (Roxo #7C3AED)
- **Contexto**: "Base consolidada e satisfeita"
- **Alerta**: "Oportunidade para maximizar receita"
- **Segmentos**: Digital Premium 30%, Familia 45%, Gamer 25%
- **Acoes**: ELITE ULTRA 1Gbps R$299 / FAMILIA PLUS 600Mbps+Disney+ R$189 / PERFORMANCE 500Mbps+IP Fixo R$199

### GROWTH (Verde #15803D)
- **Contexto**: "Baixa penetracao em area de alta qualidade tecnica"
- **Alerta**: "Janela de Ataque"
- **Segmentos**: Elite Digital 35%, Familia 45%, Basico 20%
- **Acoes**: Fibra 1Gbps+Mesh+Cashback / Fibra 500Mbps+Disney+ / WhatsApp Business+SMS

---

## RN009-02 — Segmentacao de Clientes

| Campo | Valor |
|-------|-------|
| **ID** | RN009-02 |
| **Tipo** | Derivacao |
| **Passos** | Coluna 2 do FlowPanel |

**Descricao:**
Os segmentos de clientes sao fixos por estrategia (nao derivados de dados). Cada segmento exibe:
- Nome e percentual
- Faixa de renda ou gap de receita
- Caracteristicas (device, comportamento)
- Propensao (quando aplicavel)

Nota: esta segmentacao e uma recomendacao estrategica, nao um calculo sobre dados reais. Em versao futura, sera derivada dos dados de CRM.

---

## RN009-03 — Ranking por Prioridade

| Campo | Valor |
|-------|-------|
| **ID** | RN009-03 |
| **Tipo** | Calculo |
| **Passos** | Passo 6-7 |

**Descricao:**
O ranking utiliza a mesma formula de prioridade do UC004 (RN004-01). Campos de ordenacao disponiveis:

| Campo | Chave | Acesso |
|-------|-------|--------|
| Share | share | marketShare.percentage |
| Satisfacao | satisfaction | satisfactionScores[VIVO].score |
| Clientes | clients | marketShare.activeClients |
| Renda | income | demographics.avgIncome |
| Crescimento | growth | demographics.populationGrowth |
| Nome | label | label (alfabetico) |

Default: share desc.

---

## RN009-04 — Painel de Expansao (GROWTH_RETENCAO)

| Campo | Valor |
|-------|-------|
| **ID** | RN009-04 |
| **Tipo** | Derivacao |
| **Passos** | FA01 |

**Descricao:**
O quadrante GROWTH_RETENCAO possui painel diferenciado (ExpansaoPanel):

**4 Cards de Metricas:**
1. Poder de Compra: renda media (R$)
2. Volume de Pessoas: populacao total
3. Crescimento Pop.: % anual
4. Share Vivo: % + donut

**Foco Infraestrutura:**
- Definicao de areas brancas (baixa cobertura/share)
- Roadmap: classificacao de severidade, gaps tecnicos
- Fatores de Priorizacao Zoox: poder de compra, volume, crescimento, analise competitiva

**Camada 2:** Quando disponivel, exibe classificacoes de fibra e movel + decisao integrada.
