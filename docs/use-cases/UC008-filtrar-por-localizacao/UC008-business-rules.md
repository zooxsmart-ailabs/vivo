# UC008 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC008-main-flow.md)

## RN008-01 — Zoom Automatico por Nivel de Localizacao

| Campo | Valor |
|-------|-------|
| **ID** | RN008-01 |
| **Tipo** | Derivacao |
| **Passos** | Passo 10 |

**Descricao:**

| Nivel | Zoom Sugerido | Precisao Geohash |
|-------|---------------|------------------|
| Estado | 7-8 | 4-5 |
| Cidade | 11-12 | 6 |
| Bairro | 14-15 | 7 |

---

## RN008-02 — Hierarquia de Localizacao

| Campo | Valor |
|-------|-------|
| **ID** | RN008-02 |
| **Tipo** | Derivacao |
| **Passos** | Passo 2-8 |

**Descricao:**
A localizacao e uma cascata obrigatoria:
1. **Estado** — obrigatorio, sempre selecionado
2. **Cidade** — obrigatorio apos Estado
3. **Bairro** — opcional (default: "Todos os bairros")

Fonte dos dados: campo `attr_place_region` (estado), `attr_place_subregion` (cidade), `attr_place_name` (bairro) das tabelas raw, ou `state/city/neighborhood` da `geohashCell`.

---

## RN008-03 — Sincronizacao Mapa <-> Seletor

| Campo | Valor |
|-------|-------|
| **ID** | RN008-03 |
| **Tipo** | Derivacao |
| **Passos** | Fluxo Alternativo |

**Descricao:**
A sincronizacao e bidirecional:
- **Seletor -> Mapa**: centraliza e ajusta zoom
- **Mapa -> Seletor**: atualiza Estado e Cidade (nao Bairro)

O debounce para geocoding reverso no pan e de 500ms.
