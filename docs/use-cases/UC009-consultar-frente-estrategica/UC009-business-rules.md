# UC009 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC009-main-flow.md)

**Versão**: 3.0 | **Data**: 2026-03-30 | **Fonte**: ZooxMap_Indicadores_Unificado_v2.pdf (Fev 2026)

## RN009-01 — Configuração de Fluxo por Estratégia

| Campo | Valor |
|-------|-------|
| **ID** | RN009-01 |
| **Tipo** | Derivação |
| **Passos** | Passo 10 |

**Descrição:**
Cada quadrante possui fluxo estratégico próprio (Levantamento v2):

---

### RETENCAO (Vermelho #DC2626) — Blindagem da Base

- **Cenário**: Share >= 35% + QoE < 5.0 (satisfação critica, alto risco de churn)
- **Alerta**: "Risco Iminente de Churn"
- **Responsabilidade**: Marketing, CRM e Vendas
- **Lógica de Retenção**: Churn acelerado — perda de share iminente. Ação imediata obrigatoria

**Fluxo em 4 passos:**
1. **Identificacao**: ARPU alto x SpeedTest critico → priorizar clientes de maior valor em risco
2. **Diagnóstico**: Gap de qualidade via SpeedTest vs benchmark. Causa-raiz: ERB sobrecarregada, tecnologia defasada, cobertura fraca
3. **Intervenção**: Oferta proativa de upgrade ou compensação + acionamento equipe técnica
4. **Monitoramento**: Score pos-intervenção, alerta de reincidencia se score nao melhora

**Segmentos e Ações:**

| Segmento | Perfil | Ação Recomendada |
|----------|--------|-----------------|
| Premium (30%) | Dispositivos topo, ARPU alto | Upgrade + Mesh Wi-Fi + SLA garantido |
| Familia (50%) | Plano familia, múltiplos dispositivos | Manutenção preventiva + upgrade temporario |
| Basico (20%) | Plano entrada, sensivel a preco | Verificação técnica + 15% desconto |

---

### UPSELL (Roxo #7C3AED) — Maximização de Receita

- **Cenário**: Share >= 35% + QoE >= 7.01 (base consolidada e satisfeita)
- **Alerta**: "Oportunidade para Maximizar Receita"
- **Responsabilidade**: Marketing, CRM e Vendas
- **Lógica de Retenção**: Baixo — clientes satisfeitos. Foco em upgrade de ARPU e cross-sell

**Ações:** Ofertas premium e cross-sell baseados no perfil de device, renda e consumo

**Segmentos e Ofertas:**

| Segmento | Perfil | Oferta Ideal |
|----------|--------|-------------|
| Digital Premium (30%) | Device Premium, renda alta, trabalho remoto | ELITE ULTRA 1Gbps + WiFi6 Mesh — R$299 |
| Familia (45%) | Múltiplos usuários, streaming, devices variados | FAMILIA PLUS 600Mbps + Disney+ — R$189 |
| Gamer/Streamer (25%) | Latência critica, alto upload, consumo noturno | PERFORMANCE 500Mbps + IP Fixo — R$199 |

---

### GROWTH (Verde #158030) — Geração de Leads

- **Cenário**: Share < 35% + QoE >= 7.01 (qualidade ja percebida positivamente, mercado aberto)
- **Alerta**: "Janela de Ataque"
- **Responsabilidade**: Marketing, CRM e Vendas
- **Lógica de Retenção**: Baixo para Medio — foco em novos clientes, qualidade como atrativo

**Fluxo em 4 passos:**
1. **Entendimento das Areas**: Mapeamento de potencial inexplorado — renda, densidade, crescimento pop.
2. **Geração de Leads (Zoox)**: Identificação de nao-clientes por endereco, análise demográfica, lista qualificada por geohash
3. **Criação de Personas**: Segmentação por perfil, renda, device tier e operadora atual
4. **Mensagem Personalizada**: Oferta baseada na persona e no share do concorrente local

**Segmentos e Ações:**

| Segmento | Perfil | Ação de Captação |
|----------|--------|-----------------|
| Elite Digital (35%) | iPhone Pro/S24 Ultra, viagem internacional, poder aquisitivo alto | Fibra 1Gbps + Mesh + Cashback |
| Familia (45%) | Múltiplos usuários, streaming, planejamento de custo | Fibra 500Mbps + Disney+ |
| Basico (20%) | Sensivel a preco, WhatsApp como principal uso | WhatsApp Business + SMS direto |

---

### GROWTH_RETENCAO (Ambar #D97706) — Ação Dupla: Crescimento + Retenção

- **Cenário**: Zona intermediaria — QoE entre 5.0 e 7.01 (satisfação media) ou share baixo + QoE baixa
- **Alerta**: "Perfil Misto — Monitorar e Agir"
- **Responsabilidade**: Marketing, Engenharia e CRM (ação combinada)
- **Lógica de Retenção**: Medio-Alto — risco de churn crescente com deterioração da qualidade

**Ações Combinadas:**
- Monitorar delta de share: queda acelerada → migrar para RETENCAO
- Melhoria de qualidade técnica como pre-requisito para ação comercial
- Abordagem hibrida: captação em sub-areas com share baixo + blindagem em sub-areas com share alto

**Métricas-chave para decisão de escalonamento:**
- Delta de Share < -1.0 pp → escalonar para RETENCAO
- QoE melhora para >= 7.01 → reclassificar para GROWTH ou UPSELL
- Score de prioridade P1/P2 → acio equipe de engenharia + comercial simultaneamente

---

## RN009-02 — Personas e Perfis (Levantamento v2)

| Campo | Valor |
|-------|-------|
| **ID** | RN009-02 |
| **Tipo** | Derivação |
| **Passos** | Coluna 2 do FlowPanel |

**Descrição:**
Personas comportamentais oficiais do projeto (Levantamento v2):

| Persona | Dispositivo | Uso Principal | Sensibilidade | Oferta Ideal |
|---------|-------------|---------------|---------------|-------------|
| **Elite Digital** | iPhone Pro / S24 Ultra | Internacional, trabalho remoto, video 4K | ARPU máximo, disponibilidade | Plano Black + Roaming Global |
| **Home Office** | Desktop/Notebook | Zoom/Teams continuo, arquivos grandes | Falhas e instabilidade | Fibra 1 Gbps + Mesh Wi-Fi |
| **Gamer/Streamer** | PC Gaming / Console | Latência <20ms, alto upload, streaming noturno | Latência e jitter | Rota Otimizada + Upload Simetrico |

**Segmentação econômica** (complementar as personas comportamentais):

| Segmento | Participação | Caracteristica |
|----------|-------------|----------------|
| Premium | ~30% | ARPU alto, device tier Premium/Mid, consumo dados elevado |
| Familia | ~45-50% | Plano multi-usuário, custo-beneficio, streaming compartilhado |
| Basico | ~20-25% | Sensivel a preco, uso essencial, WhatsApp como principal aplicativo |

---

## RN009-03 — Ranking por Prioridade

| Campo | Valor |
|-------|-------|
| **ID** | RN009-03 |
| **Tipo** | Cálculo |
| **Passos** | Passo 6-7 |

**Descrição:**
Ranking calculado com formulas ponderadas por quadrante (RN004-01) e labels P1-P4.

Colunas do ranking (Levantamento v2 — planilha de referência 21 geohashes):

| Coluna | Descrição |
|--------|-----------|
| Rank | Posição dentro do quadrante (#1/N) |
| Geohash | ID do geohash (ex: 6j80s173) |
| Quadrante | GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO |
| Share Atual | % share de mercado Vivo |
| Satisfação Vivo | Score QoE 0-10 |
| Nivel | Alta (>=7.01), Media (5.0-7.01), Baixa/Critica (<5.0) |
| Delta Share | pp variação vs período anterior |
| Trend | Ganhando (+), Estavel (—), Perdendo (-) |
| Renda Media | R$ mensal domiciliar |
| Pop. Total | População estimada no geohash |
| Cresc. Pop. | % crescimento anual estimado |
| Score | 0-10 (prioridade ponderada por quadrante) |
| Prioridade | P1-Critica (>7.5), P2-Alta (6-7.4), P3-Media (4.5-5.9), P4-Baixa (<4.5) |
| Prazo | Dias para ação recomendada |

---

## RN009-04 — Painel de Expansão de Infraestrutura (Camada 2)

| Campo | Valor |
|-------|-------|
| **ID** | RN009-04 |
| **Tipo** | Derivação |
| **Passos** | FA01 |

Expande o contexto da frente estratégica com dados de Camada 2 (infraestrutura).
Disponível em todos os quadrantes mas prioritario em GROWTH e GROWTH_RETENCAO.

**Base de decisão:**
- **Fibra**: taxa de ocupação, portas disponíveis, score CAPEX (AUMENTO_CAPACIDADE ou EXPANSAO_NOVA_AREA)
- **Movel**: score SpeedTest por trilha 4G/5G, classificação (MELHORA_QUALIDADE vs EXPANSAO_COBERTURA)
- **Score CAPEX Consolidado**: max(score_fibra, score_movel) — priorização unificada de investimento

**Responsabilidade**: Engenharia, Planejamento e CAPEX.
