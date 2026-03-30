# UC008 — Filtrar por Localização Geográfica

| Campo | Valor |
|-------|-------|
| **ID** | UC008 |
| **Nome** | Filtrar por Localização Geográfica |
| **Ator Primario** | Analista |
| **Atores Secundarios** | NestJS Backend (tRPC/WS), PostgreSQL + PostGIS |
| **Prioridade** | Alta |
| **Versão** | 1.0 |
| **Referencias** | UC001, UC005, UC009, UC010, UC011 |

## Objetivo

O Analista define a localização geográfica (Estado > Cidade > Bairro) para filtrar os dados em todas as abas. O filtro pode ser definido pelo centro do mapa ou por seleção explicita.

## Pre-condições

- PC01: O Analista esta autenticado (UC012)

## Pos-condições (Sucesso)

- PS01: Todas as visualizacoes filtradas pela localização selecionada
- PS02: Mapa centralizado na localização
- PS03: Seletor de localização exibe a hierarquia selecionada
- PS04: Estado persistido na sessão (UC011)

## Pos-condições (Falha)

- PF01: Localização sem dados: mensagem informativa

## Fluxo Principal (Seleção Explicita)

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Abre o seletor de localização (componente global no header) |
| 2 | Sistema | Exibe dropdown cascata: Estado > Cidade > Bairro |
| 3 | Sistema | Popula Estados com dados disponíveis no banco |
| 4 | Analista | Seleciona Estado (ex: GO) |
| 5 | Sistema | Popula Cidades do estado selecionado |
| 6 | Analista | Seleciona Cidade (ex: Goiania) |
| 7 | Sistema | Popula Bairros da cidade selecionada (opcional — pode ficar "Todos") |
| 8 | Analista | Seleciona Bairro ou mantem "Todos" |
| 9 | Sistema | Atualiza contexto global de localização |
| 10 | Sistema | Centraliza mapa na localização selecionada com zoom adequado (RN008-01) |
| 11 | Sistema | Reenvia subscriptions com nova localização |
| 12 | Sistema | Re-renderiza todas as visualizacoes |
| 13 | Sistema | Persiste localização na sessão (UC011) |

## Fluxo Alternativo: Derivado do Centro do Mapa

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Analista | Navega no mapa (pan/zoom) para outra região |
| 2 | Sistema | Detecta que o centro do mapa mudou de cidade (geocoding reverso) |
| 3 | Sistema | Atualiza seletor de localização para refletir nova cidade/estado |
| 4 | Sistema | NaO muda bairro (fica "Todos" ao navegar pelo mapa) |
| 5 | Sistema | Propaga nova localização para abas Frentes e Bairros |

## Fluxos Relacionados

| Tipo | ID | Condição de Desvio |
|------|----|--------------------|
| Alternativo | [FA01](./UC008-alt-flows.md#fa01) | Localização sem dados no período |
| Exceção | [FE01](./UC008-alt-flows.md#fe01) | Geocoding reverso falha |

## Regras de Negócio Aplicadas

Veja [UC008-business-rules.md](./UC008-business-rules.md)

## Pontos de Função

Veja [UC008-function-points.md](./UC008-function-points.md)
