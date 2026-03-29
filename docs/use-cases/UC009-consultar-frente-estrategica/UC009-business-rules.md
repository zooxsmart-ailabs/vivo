# UC009 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC009-main-flow.md)

**Versao**: 2.0 | **Data**: 2026-03-29 | **Fonte**: Levantamento v1203

## RN009-01 — Configuracao de Fluxo por Estrategia

| Campo | Valor |
|-------|-------|
| **ID** | RN009-01 |
| **Tipo** | Derivacao |
| **Passos** | Passo 10 |

**Descricao:**
Cada quadrante possui fluxo estrategico (Levantamento v1203):

### RISCO (Vermelho #EF4444) — Blindagem da Base
- **Cenario**: Share Alto (>=40%) + Satisfacao Baixa (<6.0)
- **Alerta**: "Risco Iminente de Churn"
- **Responsabilidade**: Marketing, CRM e Vendas
- **Fluxo em 4 passos**:
  1. **Identificacao**: ARPU alto × SpeedTest ruim → priorizar por valor em risco
  2. **Diagnostico**: Gap de qualidade via SpeedTest, causa-raiz (ERB sobrecarregada, tecnologia defasada, cobertura fraca)
  3. **Intervencao**: Oferta proativa de upgrade ou compensacao, acionamento da equipe tecnica
  4. **Monitoramento**: Acompanhamento do score pos-intervencao, alerta de reincidencia
- **Segmentos**: Premium 30%, Familia 50%, Basico 20%
- **Acoes**: Upgrade + Mesh + SLA / Manutencao preventiva + upgrade temporario / Verificacao tecnica + 15% desconto

### FORTALEZA (Roxo #7C3AED) — Maximizacao de Receita
- **Cenario**: Share Alto (>=40%) + Satisfacao Alta (>=7.5)
- **Alerta**: "Oportunidade para Maximizar Receita"
- **Responsabilidade**: Marketing, CRM e Vendas
- **Acoes**: Ofertas Premium e Cross-sell baseados no perfil
- **Segmentos**: Digital Premium 30%, Familia 45%, Gamer 25%
- **Ofertas**: ELITE ULTRA 1Gbps+WiFi6 Mesh R$299 / FAMILIA PLUS 600Mbps+Disney+ R$189 / PERFORMANCE 500Mbps+IP Fixo R$199

### OPORTUNIDADE (Verde #22C55E) — Geracao de Leads
- **Cenario**: Share Baixo (<30%) + Satisfacao Alta (>=7.5)
- **Alerta**: "Janela de Ataque"
- **Responsabilidade**: Marketing, CRM e Vendas
- **Fluxo em 4 passos**:
  1. **Entendimento das Areas**: Mapeamento de bolsoes de insatisfacao e potencial inexplorado
  2. **Geracao de Leads (Zoox)**: Identificacao de nao-clientes por endereco, analise demografica, lista qualificada
  3. **Criacao de Personas**: Segmentacao por perfil e renda, dados comportamentais, operadora atual e share
  4. **Entendimento das Areas**: Mensagem personalizada por persona, oferta baseada na concorrencia
- **Segmentos**: Elite Digital 35%, Familia 45%, Basico 20%
- **Acoes**: Fibra 1Gbps+Mesh+Cashback / Fibra 500Mbps+Disney+ / WhatsApp Business+SMS

### EXPANSAO (Laranja #F97316) — Diagnostico Tecnico + Captacao
- **Cenario**: Share Baixo (<30%) + Satisfacao Baixa (<6.0)
- **Alerta**: "Dupla Frente"
- **Responsabilidade**: Engenharia, Planejamento e CAPEX
- **Metricas**: Poder de compra (renda), volume de pessoas, crescimento pop., share Vivo
- **Acao**: Diagnostico Tecnico Urgente + Captacao Condicionada

---

## RN009-02 — Personas e Perfis (Levantamento v1203)

| Campo | Valor |
|-------|-------|
| **ID** | RN009-02 |
| **Tipo** | Derivacao |
| **Passos** | Coluna 2 do FlowPanel |

**Descricao:**
Personas oficiais do projeto (Levantamento — Conexao Territorial + Personas):

| Persona | Caracteristicas | Oferta Ideal |
|---------|----------------|--------------|
| **Elite Digital** | iPhone Pro/S24 Ultra, viagem internacional, alto poder aquisitivo | Plano Black + Roaming Global |
| **Home Office** | Sensivel a falhas, uso intenso de Zoom/Teams, desktop/notebook | Fibra 1 Gbps + Mesh Wi-Fi |
| **Gamer/Streamer** | Sensivel a latencia, alto upload (streaming), consumo noturno | Rota Otimizada + Upload Simetrico |

Nota: As personas do prototipo (Premium/Familia/Basico) permanecem como segmentacao economica. As personas acima sao comportamentais e complementares.

---

## RN009-03 — Ranking por Prioridade

| Campo | Valor |
|-------|-------|
| **ID** | RN009-03 |
| **Tipo** | Calculo |
| **Passos** | Passo 6-7 |

**Descricao:**
Ranking atualizado com formulas ponderadas (RN004-01) e labels P1-P4 por score absoluto.

Colunas do ranking (Levantamento — planilha de 21 geohashes):

| Coluna | Descricao |
|--------|-----------|
| Rank | Posicao dentro do quadrante (#1/N) |
| Geohash | ID do geohash |
| Quadrante | RISCO, FORTALEZA, OPORTUNIDADE, EXPANSAO |
| Share Atual | % share de mercado Vivo |
| Satisfacao Vivo | Score 0-10 |
| Nivel | Alta, Media, Baixa, Critica |
| Delta Share | pp variacao vs periodo anterior |
| Trend | Ganhando, Estavel, Perdendo |
| Renda Media | R$ mensal |
| Pop. Total | Populacao no geohash |
| Cresc. Pop. | % crescimento anual |
| Score | 0-10 (prioridade ponderada) |
| Prioridade | P1-Critica a P4-Baixa |
| Prazo | Dias para acao |

---

## RN009-04 — Painel de Expansao

| Campo | Valor |
|-------|-------|
| **ID** | RN009-04 |
| **Tipo** | Derivacao |
| **Passos** | FA01 |

Sem alteracao estrutural. Renomeado de EXPANSAO para **EXPANSAO**.
Base de decisao: Dados Tecnicos (Ocupacao, White Spots) + Potencial de Mercado.
Responsabilidade: Engenharia, Planejamento e CAPEX.
