# UC007 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC007-main-flow.md)

## RN007-01 — Cores de Variacao no Mapa

| Campo | Valor |
|-------|-------|
| **ID** | RN007-01 |
| **Tipo** | Derivacao |
| **Passos** | Passo 8 |

**Descricao:**
Em modo comparacao, o mapa pode alternar entre dois modos de cor:
1. **Quadrante** (default): cores por quadrante estrategico (como UC001)
2. **Variacao**: cores por delta de share ou satisfacao

| Delta Share | Cor | Significado |
|-------------|-----|-------------|
| >= +5 pp | #16A34A (verde forte) | Melhora significativa |
| +1 a +5 pp | #86EFAC (verde claro) | Melhora moderada |
| -1 a +1 pp | #94A3B8 (cinza) | Estavel |
| -5 a -1 pp | #FCA5A5 (vermelho claro) | Piora moderada |
| <= -5 pp | #DC2626 (vermelho forte) | Piora significativa |

---

## RN007-02 — Validacao de Periodos Nao Sobrepostos

| Campo | Valor |
|-------|-------|
| **ID** | RN007-02 |
| **Tipo** | Validacao |
| **Passos** | Passo 4 |

**Descricao:**
Os dois periodos selecionados nao podem ter meses em comum.

**Exemplo:**
- Valido: Base=Jan-Mar 2026, Comparacao=Out-Dez 2025
- Invalido: Base=Jan-Mar 2026, Comparacao=Feb-Apr 2026 (Feb-Mar sobrepostos)

---

## RN007-03 — Calculo de Diff por Metrica

| Campo | Valor |
|-------|-------|
| **ID** | RN007-03 |
| **Tipo** | Calculo |
| **Passos** | Passo 6 |

**Descricao:**

| Metrica | Formula Diff | Unidade |
|---------|-------------|---------|
| Share | `base.sharePct - comp.sharePct` | pp (percentage points) |
| Satisfacao | `base.score - comp.score` | pontos (0-10) |
| Download | `base.avgDownload - comp.avgDownload` | Mbps |
| Latencia | `base.avgLatency - comp.avgLatency` | ms (negativo = melhor) |
| Clientes | `base.activeClients - comp.activeClients` | unidades |
| Quadrante | Mudou? (ex: GROWTH -> RETENCAO) | categorico |

**Indicadores visuais:**
- Positivo (melhora): seta verde para cima
- Negativo (piora): seta vermelha para baixo
- Estavel (dentro da margem): seta cinza horizontal
- Mudanca de quadrante: badge especial com cor anterior -> cor atual
