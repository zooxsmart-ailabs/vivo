# UC005 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC005-main-flow.md)

## RN005-01 — Debounce de Zoom

| Campo | Valor |
|-------|-------|
| **ID** | RN005-01 |
| **Tipo** | Temporizacao |
| **Passos** | Passo 2 |

**Descricao:**
Mudancas de zoom sao agrupadas com debounce de 300ms para evitar multiplas subscriptions durante scroll continuo. Somente o ultimo zoom apos 300ms de inatividade dispara nova subscription.

---

## RN005-02 — Agregacao por Precisao

| Campo | Valor |
|-------|-------|
| **ID** | RN005-02 |
| **Tipo** | Calculo |
| **Passos** | Passo 6 |

**Descricao:**
Ao mudar precisao (ex: 7 -> 6), os dados sao agregados:

- **Share**: media ponderada pelo total de domicilios/populacao dos geohashes filhos
- **Satisfacao**: media ponderada pelo sampleSize dos geohashes filhos
- **Quadrante**: recalculado com os valores agregados vs benchmarks
- **Trend**: delta do share agregado vs periodo anterior
- **Camada 2**: classificacao dominante entre os filhos

A agregacao e feita via continuous aggregate ou view materializada no PostgreSQL, nao no frontend.

---

## RN005-03 — Transicao Visual

| Campo | Valor |
|-------|-------|
| **ID** | RN005-03 |
| **Tipo** | Derivacao |
| **Passos** | Passo 7, 8 |

**Descricao:**
A transicao entre precisoes usa fade para suavizar a experiencia:
1. Poligonos atuais: fade out (opacity 0.4 -> 0, 200ms)
2. Remove poligonos do mapa
3. Adiciona novos poligonos com opacity 0
4. Novos poligonos: fade in (opacity 0 -> 0.4, 200ms)
