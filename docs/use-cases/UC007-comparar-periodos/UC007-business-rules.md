# UC007 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC007-main-flow.md)

## RN007-01 — Cores de Variação no Mapa

| Campo | Valor |
|-------|-------|
| **ID** | RN007-01 |
| **Tipo** | Derivação |
| **Passos** | Passo 8 |

**Descrição:**
Em modo comparação, o mapa pode alternar entre dois modos de cor:
1. **Quadrante** (default): cores por quadrante estratégico (como UC001)
2. **Variação**: cores por delta de share ou satisfação

| Delta Share | Cor | Significado |
|-------------|-----|-------------|
| >= +5 pp | #16A34A (verde forte) | Melhora significativa |
| +1 a +5 pp | #86EFAC (verde claro) | Melhora moderada |
| -1 a +1 pp | #94A3B8 (cinza) | Estável |
| -5 a -1 pp | #FCA5A5 (vermelho claro) | Piora moderada |
| <= -5 pp | #DC2626 (vermelho forte) | Piora significativa |

---

## RN007-02 — Validação de Períodos Não Sobrepostos

| Campo | Valor |
|-------|-------|
| **ID** | RN007-02 |
| **Tipo** | Validação |
| **Passos** | Passo 4 |

**Descrição:**
Os dois períodos selecionados não podem ter meses em comum.

**Exemplo:**
- Válido: Base=Jan-Mar 2026, Comparação=Out-Dez 2025
- Inválido: Base=Jan-Mar 2026, Comparação=Feb-Apr 2026 (Feb-Mar sobrepostos)

---

## RN007-03 — Cálculo de Diff por Métrica

| Campo | Valor |
|-------|-------|
| **ID** | RN007-03 |
| **Tipo** | Cálculo |
| **Passos** | Passo 6 |

**Descrição:**

| Métrica | Fórmula Diff | Unidade |
|---------|-------------|---------|
| Share | `base.sharePct - comp.sharePct` | pp (percentage points) |
| Satisfação | `base.score - comp.score` | pontos (0-10) |
| Download | `base.avgDownload - comp.avgDownload` | Mbps |
| Latência | `base.avgLatency - comp.avgLatency` | ms (negativo = melhor) |
| Clientes | `base.activeClients - comp.activeClients` | unidades |
| Quadrante | Mudou? (ex: OPORTUNIDADE -> RISCO) | categórico |

**Indicadores visuais:**
- Positivo (melhora): seta verde para cima
- Negativo (piora): seta vermelha para baixo
- Estável (dentro da margem): seta cinza horizontal
- Mudança de quadrante: badge especial com cor anterior -> cor atual
