# UC012 — Fluxos Alternativos e de Exceção

[<- Voltar ao fluxo principal](./UC012-main-flow.md)

---

## FA01 — Modo Bypass (Desenvolvimento) {#fa01}

**Condição de Desvio:** `AUTH_STRATEGY=bypass` configurado no ambiente.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Guard detecta estratégia bypass |
| 2 | Sistema | Retorna user mock: `{ sub: "dev-user", name: "Dev", roles: ["admin"] }` |
| 3 | Sistema | Permite acesso sem validação de token |
| 4 | Sistema | Exibe badge "Dev Mode" no header da aplicação |

> **Retorno:** Passo 6 do fluxo principal.

---

## FE01 — Token Invalido ou Expirado {#fe01}

**Condição de Desvio:** No passo 4, a validação do token falha.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Guard rejeita a requisição |
| 2 | Sistema | HTTP: retorna 401 Unauthorized |
| 3 | Sistema | WS: fecha conexão com código 4401 |
| 4 | Sistema | Frontend detecta 401 e redireciona para `authStrategy.getLoginUrl()` |
| 5 | Sistema | Registra tentativa no SigNoz (sem dados sensiveis) |

---

## FE02 — Provedor de Auth Indisponivel {#fe02}

**Condição de Desvio:** No passo 4, o provedor externo nao responde.

| Passo | Ator | Ação / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Timeout apos 5s tentando validar |
| 2 | Sistema | Se cache de validação disponível (Redis): aceita token previamente validado |
| 3 | Sistema | Se nao: retorna 503 Service Unavailable |
| 4 | Sistema | Frontend exibe: "Servico de autenticação indisponivel. Tente novamente." |
| 5 | Sistema | Registra incidente no SigNoz |
