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

- **Cenário**: Share >= 35% + QoE < 5.0 (satisfação crítica, alto risco de churn)
- **Alerta**: "Risco Iminente de Churn"
- **Responsabilidade**: Marketing, CRM e Vendas
- **Lógica de Retenção**: Churn acelerado — perda de share iminente. Ação imediata obrigatória

**Fluxo em 4 passos:**
1. **Identificação**: ARPU alto x SpeedTest crítico → priorizar clientes de maior valor em risco
2. **Diagnóstico**: Gap de qualidade via SpeedTest vs benchmark. Causa-raiz: ERB sobrecarregada, tecnologia defasada, cobertura fraca
3. **Intervenção**: Oferta proativa de upgrade ou compensação + acionamento equipe técnica
4. **Monitoramento**: Score pós-intervenção, alerta de reincidência se score não melhora

**Segmentos e Ações:**

| Segmento | Perfil | Ação Recomendada |
|----------|--------|-----------------|
| Premium (30%) | Dispositivos topo, ARPU alto | Upgrade + Mesh Wi-Fi + SLA garantido |
| Família (50%) | Plano família, múltiplos dispositivos | Manutenção preventiva + upgrade temporário |
| Básico (20%) | Plano entrada, sensível a preço | Verificação técnica + 15% desconto |

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
| Família (45%) | Múltiplos usuários, streaming, devices variados | FAMILIA PLUS 600Mbps + Disney+ — R$189 |
| Gamer/Streamer (25%) | Latência crítica, alto upload, consumo noturno | PERFORMANCE 500Mbps + IP Fixo — R$199 |

---

### GROWTH (Verde #158030) — Geração de Leads

- **Cenário**: Share < 35% + QoE >= 7.01 (qualidade já percebida positivamente, mercado aberto)
- **Alerta**: "Janela de Ataque"
- **Responsabilidade**: Marketing, CRM e Vendas
- **Lógica de Retenção**: Baixo para Médio — foco em novos clientes, qualidade como atrativo

**Fluxo em 4 passos:**
1. **Entendimento das Áreas**: Mapeamento de potencial inexplorado — renda, densidade, crescimento pop.
2. **Geração de Leads (Zoox)**: Identificação de não-clientes por endereço, análise demográfica, lista qualificada por geohash
3. **Criação de Personas**: Segmentação por perfil, renda, device tier e operadora atual
4. **Mensagem Personalizada**: Oferta baseada na persona e no share do concorrente local

**Segmentos e Ações:**

| Segmento | Perfil | Ação de Captação |
|----------|--------|-----------------|
| Elite Digital (35%) | iPhone Pro/S24 Ultra, viagem internacional, poder aquisitivo alto | Fibra 1Gbps + Mesh + Cashback |
| Família (45%) | Múltiplos usuários, streaming, planejamento de custo | Fibra 500Mbps + Disney+ |
| Básico (20%) | Sensível a preço, WhatsApp como principal uso | WhatsApp Business + SMS direto |

---

### GROWTH_RETENCAO (Âmbar #D97706) — Ação Dupla: Crescimento + Retenção

- **Cenário**: Zona intermediária — QoE entre 5.0 e 7.01 (satisfação média) ou share baixo + QoE baixa
- **Alerta**: "Perfil Misto — Monitorar e Agir"
- **Responsabilidade**: Marketing, Engenharia e CRM (ação combinada)
- **Lógica de Retenção**: Médio-Alto — risco de churn crescente com deterioração da qualidade

**Ações Combinadas:**
- Monitorar delta de share: queda acelerada → migrar para RETENCAO
- Melhoria de qualidade técnica como pré-requisito para ação comercial
- Abordagem híbrida: captação em sub-áreas com share baixo + blindagem em sub-áreas com share alto

**Métricas-chave para decisão de escalonamento:**
- Delta de Share < -1.0 pp → escalonar para RETENCAO
- QoE melhora para >= 7.01 → reclassificar para GROWTH ou UPSELL
- Score de prioridade P1/P2 → acionar equipe de engenharia + comercial simultaneamente

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
| **Home Office** | Desktop/Notebook | Zoom/Teams contínuo, arquivos grandes | Falhas e instabilidade | Fibra 1 Gbps + Mesh Wi-Fi |
| **Gamer/Streamer** | PC Gaming / Console | Latência <20ms, alto upload, streaming noturno | Latência e jitter | Rota Otimizada + Upload Simétrico |

**Segmentação econômica** (complementar às personas comportamentais):

| Segmento | Participação | Característica |
|----------|-------------|----------------|
| Premium | ~30% | ARPU alto, device tier Premium/Mid, consumo dados elevado |
| Família | ~45-50% | Plano multi-usuário, custo-benefício, streaming compartilhado |
| Básico | ~20-25% | Sensível a preço, uso essencial, WhatsApp como principal aplicativo |

---

## RN009-03 — Ranking por Prioridade

| Campo | Valor |
|-------|-------|
| **ID** | RN009-03 |
| **Tipo** | Cálculo |
| **Passos** | Passo 6-7 |

**Descrição:**
Ranking calculado com fórmulas ponderadas por quadrante (RN004-01) e labels P1-P4.

Colunas do ranking (Levantamento v2 — planilha de referência 21 geohashes):

| Coluna | Descrição |
|--------|-----------|
| Rank | Posição dentro do quadrante (#1/N) |
| Geohash | ID do geohash (ex: 6j80s173) |
| Quadrante | GROWTH, UPSELL, RETENCAO, GROWTH_RETENCAO |
| Share Atual | % share de mercado Vivo |
| Satisfação Vivo | Score QoE 0-10 |
| Nível | Alta (>=7.01), Média (5.0-7.01), Baixa/Crítica (<5.0) |
| Delta Share | pp variação vs período anterior |
| Trend | Ganhando (+), Estável (—), Perdendo (-) |
| Renda Média | R$ mensal domiciliar |
| Pop. Total | População estimada no geohash |
| Cresc. Pop. | % crescimento anual estimado |
| Score | 0-10 (prioridade ponderada por quadrante) |
| Prioridade | P1-Crítica (>7.5), P2-Alta (6-7.4), P3-Média (4.5-5.9), P4-Baixa (<4.5) |
| Prazo | Dias para ação recomendada |

---

## RN009-04 — Painel de Expansão de Infraestrutura (Camada 2)

| Campo | Valor |
|-------|-------|
| **ID** | RN009-04 |
| **Tipo** | Derivação |
| **Passos** | FA01 |

Expande o contexto da frente estratégica com dados de Camada 2 (infraestrutura).
Disponível em todos os quadrantes mas prioritário em GROWTH e GROWTH_RETENCAO.

**Base de decisão:**
- **Fibra**: taxa de ocupação, portas disponíveis, score CAPEX (AUMENTO_CAPACIDADE ou EXPANSAO_NOVA_AREA)
- **Móvel**: score SpeedTest por trilha 4G/5G, classificação (MELHORA_QUALIDADE vs EXPANSAO_COBERTURA)
- **Score CAPEX Consolidado**: max(score_fibra, score_movel) — priorização unificada de investimento

**Responsabilidade**: Engenharia, Planejamento e CAPEX.

---

## RN009-05 — Avaliação Diagnóstica dos 4 Pilares

| Campo | Valor |
|-------|-------|
| **ID** | RN009-05 |
| **Tipo** | Cálculo |
| **Passos** | Passo 10 (Diagnóstico Growth) |
| **Fonte** | `data-viz/apps/web/app/composables/useDiagnostico.ts` |

**Descrição:**
A frente GROWTH utiliza um motor diagnóstico que avalia 4 pilares estratégicos.
Cada pilar contém 2 métricas, cada uma avaliada com sinal ternário (OK, Alerta, Crítico).
O sinal do pilar é o **pior sinal** entre suas métricas (worst-signal aggregation).

### Pilar 01 — Percepção

Mede como o cliente percebe a qualidade do serviço Vivo no geohash.

| Métrica | Fórmula | OK | Alerta | Crítico |
|---------|---------|-----|--------|---------|
| Score Ookla | Score SpeedTest Vivo no geohash (0-10) | ≥ 8.0 | 6.0–7.9 | < 6.0 |
| Vol. Chamados | (RAC + SAC 30d) / Base Ativa Vivo (%) | < 3% | 3–5% | > 5% |

**Sinal do pilar**: `worstSignal(scoreOokla, volChamados)`
**Fonte de dados**: `score.vl_cntv_scre` (Ookla), **taxaChamados ainda não disponível no banco** (stub = 0).

### Pilar 02 — Concorrência

Avalia a posição competitiva da Vivo no geohash.

| Métrica | Fórmula | OK | Alerta | Crítico |
|---------|---------|-----|--------|---------|
| Share / Penetração | Base Vivo / Total Domicílios (Zoox) (%) | < 20% | 20–40% | > 40% |
| Vantagem vs Líder | Delta score Vivo − score líder (Ookla) | > 0 | −1.0 a 0 | < −1.0 |

**Sinal do pilar**: `worstSignal(sharePenetracao, deltaVsLider)`
**Interpretação inversa para GROWTH**: share baixo (< 20%) = "Alta Oportunidade", share alto (> 40%) = "Saturado".
**Fonte de dados**: `vw_share_real` (share), `score` (delta).

### Pilar 03 — Infraestrutura

Avalia disponibilidade e saúde da infraestrutura de rede no geohash.

| Métrica | Classificação Camada 2 | OK | Alerta | Crítico |
|---------|------------------------|-----|--------|---------|
| Fibra (Status) | `camada2_fibra.classification` | SAUDAVEL | AUMENTO_CAPACIDADE | EXPANSAO_NOVA_AREA |
| Móvel (Status) | `camada2_movel.classification` | SAUDAVEL | EXPANSAO_5G / EXPANSAO_4G | MELHORA_QUALIDADE |

**Sinal do pilar**: `worstSignal(fibra, movel)`
**Fonte de dados**: `camada2_fibra`, `camada2_movel`.

### Pilar 04 — Comportamento

Avalia perfil econômico e afinidade de canal do geohash.

| Métrica | Fórmula | OK | Alerta | Crítico |
|---------|---------|-----|--------|---------|
| Sensibilidade a Preço | ARPU Geohash / ARPU Médio da Cidade | > 1.1 | 0.9–1.1 | < 0.9 |
| Afinidade de Canal | Vendas Canal Dominante / Total Vendas (%) | ≥ 50% | 20–50% | < 20% |

**Sinal do pilar**: `worstSignal(arpuRelativo, canalPct)`
**Interpretação**:
- `arpuRelativo > 1.1` → "Foco em Totalização" (bundle premium)
- `arpuRelativo 0.9-1.1` → "Mix de Ofertas"
- `arpuRelativo < 0.9` → "Sensível a Preço" (entrada competitiva)
- `canalPct >= 50%` → "Canal Dominante — priorizar 80% da verba"
- `canalPct < 20%` → "Canal Ineficiente — redefinir estratégia"
**Fonte de dados**: `geohash_crm` (ARPU), **canalDominante/canalPct ainda não disponíveis no banco** (stubs).

---

## RN009-06 — Árvore de Decisão IA (Recomendação)

| Campo | Valor |
|-------|-------|
| **ID** | RN009-06 |
| **Tipo** | Derivação |
| **Passos** | Passo 10 (Card de Recomendação IA) |
| **Fonte** | `useDiagnostico.ts → gerarRec()` |

**Descrição:**
O motor de recomendação IA combina os sinais dos 4 pilares e classificações de Camada 2
para gerar uma decisão estratégica com 3 estados possíveis:

### Decisão

| Estado | Cor | Condição |
|--------|-----|----------|
| **BLOQUEADO** | #DC2626 (Vermelho) | Fibra = EXPANSAO_NOVA_AREA **OU** (percepção crítica **E** concorrência crítica) |
| **AGUARDAR** | #D97706 (Âmbar) | Infraestrutura com gargalo (fibra AUMENTO_CAPACIDADE ou móvel MELHORA_QUALIDADE) **OU** percepção crítica **OU** concorrência crítica |
| **ATIVAR** | #16A34A (Verde) | Nenhuma das condições acima — infraestrutura saudável, percepção e concorrência adequadas |

**Critérios detalhados:**
- `percepção crítica` = scoreOokla < 6.0 **OU** taxaChamados > 5%
- `concorrência crítica` = deltaVsLider < −1.0
- `infraestrutura com gargalo` = fibra AUMENTO_CAPACIDADE **OU** móvel MELHORA_QUALIDADE

### Saída da Recomendação

| Campo | Descrição |
|-------|-----------|
| decisão | ATIVAR, AGUARDAR ou BLOQUEADO |
| canal | Canal recomendado + alocação de verba |
| abordagem | Texto prescritivo com estratégia de abordagem comercial |
| raciocínio | Justificativa composta pelos sinais avaliados |

---

## RN009-07 — Lógica de Abordagem Comercial

| Campo | Valor |
|-------|-------|
| **ID** | RN009-07 |
| **Tipo** | Derivação |
| **Passos** | Passo 10 (Campo "abordagem" da Recomendação IA) |

**Descrição:**
A abordagem comercial é determinada pela combinação do estado da infraestrutura
com o perfil econômico (arpuRelativo) do geohash:

| Cenário de Infraestrutura | Abordagem |
|---------------------------|-----------|
| Fibra bloqueada (EXPANSAO_NOVA_AREA) | Não ativar growth de fibra. Focar exclusivamente em móvel |
| Fibra gargalo + móvel saudável | Priorizar aquisição via móvel enquanto capacidade de fibra é ampliada |
| Móvel problema + fibra saudável | Priorizar oferta de fibra. Não incluir móvel no pitch até resolução técnica |
| Ambos com restrição | Aguardar resolução de infraestrutura antes de ativar growth |
| Móvel expansão 5G/4G (cobertura em andamento) | Abordar com oferta de fibra como produto principal |
| Infra saudável + arpuRelativo > 1.1 | Oferta de totalização (Fibra + Móvel + Streaming). Perfil premium — bundle completo |
| Infra saudável + arpuRelativo 0.9-1.1 | Mix de ofertas com ancoragem de preço. Comparativo custo-benefício vs concorrência |
| Infra saudável + arpuRelativo < 0.9 | Oferta de entrada com preço competitivo. Evitar planos premium no primeiro contato. Upsell gradual |

**Lógica de Canal:**
- `canalPct >= 50%` → Canal dominante — priorizar 80% da verba nesse canal
- `canalPct 20-50%` → Canal dominante + canal complementar
- `canalPct < 20%` → Redefinir canal — canal atual ineficiente

---

## RN009-08 — Agregação de Sinais (Worst-Signal)

| Campo | Valor |
|-------|-------|
| **ID** | RN009-08 |
| **Tipo** | Cálculo |
| **Passos** | Todos os pilares de RN009-05 |

**Descrição:**
Cada pilar agrega suas N métricas em um único sinal usando a regra do **pior sinal**:

```
function worstSignal(...sinais):
  se algum sinal == "critico" → retorna "critico"
  se algum sinal == "alerta"  → retorna "alerta"
  senao                       → retorna "ok"
```

**Estilos visuais por sinal:**

| Sinal | Fundo | Borda | Texto | Dot | Label |
|-------|-------|-------|-------|-----|-------|
| OK | #F0FDF4 | #BBF7D0 | #15803D | #16A34A | "OK" |
| Alerta | #FFFBEB | #FDE68A | #B45309 | #D97706 | "Alerta" |
| Crítico | #FEF2F2 | #FECACA | #DC2626 | #EF4444 | "Crítico" |
