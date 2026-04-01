# UC001 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC001-main-flow.md)

---

## FA01 — Viewport Sem Dados {#fa01}

**Condição de Desvio:** No passo 6, a query retorna 0 geohashes para o viewport e período selecionados.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Renderiza mapa sem polígonos |
| 2 | Sistema | Exibe mensagem central: "Sem dados de QoE para esta região no período selecionado" |
| 3 | Sistema | Contadores mostram 0/0 |
| 4 | Analista | Ajusta período (UC006) ou localização (UC008) |

> **Retorno:** Passo 4 do fluxo principal ao receber novos dados via WS.

---

## FA02 — Reconexão WebSocket {#fa02}

**Condição de Desvio:** No passo 4 ou posterior, a conexão WebSocket é perdida temporariamente.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Detecta desconexão do WS |
| 2 | Sistema | Exibe badge "Reconectando..." com indicador amarelo (substitui "Live Data") |
| 3 | Sistema | Mantém polígonos já renderizados no mapa (dados em cache local) |
| 4 | Sistema | Tenta reconexão com backoff exponencial (1s, 2s, 4s, 8s, max 30s) |
| 5 | Sistema | Ao reconectar, reenvia subscription com viewport/filtros atuais |
| 6 | Sistema | Restaura badge "Live Data" com indicador verde |

> **Retorno:** Passo 5 do fluxo principal.

---

## FE01 — Falha na Conexão WebSocket {#fe01}

**Condição de Desvio:** No passo 4, a conexão WebSocket falha após esgotar tentativas de reconexão (5 tentativas).

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Exibe toast de erro: "Não foi possível conectar ao servidor. Verifique sua conexão." |
| 2 | Sistema | Exibe badge "Offline" com indicador vermelho |
| 3 | Sistema | Mantém dados em cache local se disponíveis |
| 4 | Sistema | Oferece botão "Tentar novamente" |
| 5 | Analista | Clica "Tentar novamente" |
| 6 | Sistema | Reinicia ciclo de conexão (volta ao passo 4 do fluxo principal) |

---

## FE02 — Google Maps API Indisponível {#fe02}

**Condição de Desvio:** No passo 7, o carregamento da Google Maps API falha.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Detecta falha no carregamento da API |
| 2 | Sistema | Exibe fallback: área cinza com mensagem "Mapa indisponível" |
| 3 | Sistema | Registra erro no SigNoz via OpenTelemetry |
| 4 | Sistema | Os dados de geohash continuam disponíveis nas outras abas (UC009, UC010) |
