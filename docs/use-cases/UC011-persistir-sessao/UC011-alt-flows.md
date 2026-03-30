# UC011 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC011-main-flow.md)

---

## FA01 — Sessão Expirada no Redis {#fa01}

**Condição de Desvio:** Redis retorna null (TTL expirado) no passo Restaurar 3.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Consulta PostgreSQL: `SELECT state FROM user_session WHERE user_id = ?` |
| 2 | Sistema | Se encontrado: deserializa e restaura |
| 3 | Sistema | Repopula Redis com o estado recuperado (renova TTL) |

> **Retorno:** Passo 4 do fluxo Restaurar.

---

## FE01 — Redis Indisponivel {#fe01}

**Condição de Desvio:** Redis nao responde.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Log warning no SigNoz |
| 2 | Sistema | Persistência: grava diretamente no PostgreSQL |
| 3 | Sistema | Restauração: consulta PostgreSQL diretamente |
| 4 | Sistema | Aplicação funciona normalmente (sem cache de sessão) |

> **Retorno:** Operação transparente para o usuário.
