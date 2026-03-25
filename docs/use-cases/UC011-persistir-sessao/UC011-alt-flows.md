# UC011 — Fluxos Alternativos e de Excecao

[<- Voltar ao fluxo principal](./UC011-main-flow.md)

---

## FA01 — Sessao Expirada no Redis {#fa01}

**Condicao de Desvio:** Redis retorna null (TTL expirado) no passo Restaurar 3.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Consulta PostgreSQL: `SELECT state FROM user_session WHERE user_id = ?` |
| 2 | Sistema | Se encontrado: deserializa e restaura |
| 3 | Sistema | Repopula Redis com o estado recuperado (renova TTL) |

> **Retorno:** Passo 4 do fluxo Restaurar.

---

## FE01 — Redis Indisponivel {#fe01}

**Condicao de Desvio:** Redis nao responde.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Log warning no SigNoz |
| 2 | Sistema | Persistencia: grava diretamente no PostgreSQL |
| 3 | Sistema | Restauracao: consulta PostgreSQL diretamente |
| 4 | Sistema | Aplicacao funciona normalmente (sem cache de sessao) |

> **Retorno:** Operacao transparente para o usuario.
