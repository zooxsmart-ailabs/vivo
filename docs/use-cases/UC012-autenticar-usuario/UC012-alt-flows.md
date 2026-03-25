# UC012 — Fluxos Alternativos e de Excecao

[<- Voltar ao fluxo principal](./UC012-main-flow.md)

---

## FA01 — Modo Bypass (Desenvolvimento) {#fa01}

**Condicao de Desvio:** `AUTH_STRATEGY=bypass` configurado no ambiente.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Guard detecta estrategia bypass |
| 2 | Sistema | Retorna user mock: `{ sub: "dev-user", name: "Dev", roles: ["admin"] }` |
| 3 | Sistema | Permite acesso sem validacao de token |
| 4 | Sistema | Exibe badge "Dev Mode" no header da aplicacao |

> **Retorno:** Passo 6 do fluxo principal.

---

## FE01 — Token Invalido ou Expirado {#fe01}

**Condicao de Desvio:** No passo 4, a validacao do token falha.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Guard rejeita a requisicao |
| 2 | Sistema | HTTP: retorna 401 Unauthorized |
| 3 | Sistema | WS: fecha conexao com codigo 4401 |
| 4 | Sistema | Frontend detecta 401 e redireciona para `authStrategy.getLoginUrl()` |
| 5 | Sistema | Registra tentativa no SigNoz (sem dados sensiveis) |

---

## FE02 — Provedor de Auth Indisponivel {#fe02}

**Condicao de Desvio:** No passo 4, o provedor externo nao responde.

| Passo | Ator | Acao / Resposta do Sistema |
|-------|------|----------------------------|
| 1 | Sistema | Timeout apos 5s tentando validar |
| 2 | Sistema | Se cache de validacao disponivel (Redis): aceita token previamente validado |
| 3 | Sistema | Se nao: retorna 503 Service Unavailable |
| 4 | Sistema | Frontend exibe: "Servico de autenticacao indisponivel. Tente novamente." |
| 5 | Sistema | Registra incidente no SigNoz |
