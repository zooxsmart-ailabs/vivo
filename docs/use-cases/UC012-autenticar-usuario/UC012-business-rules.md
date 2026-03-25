# UC012 — Regras de Negocio

[<- Voltar ao fluxo principal](./UC012-main-flow.md)

## RN012-01 — Estrategia de Autenticacao Plugavel

| Campo | Valor |
|-------|-------|
| **ID** | RN012-01 |
| **Tipo** | Autorizacao |
| **Passos** | Passo 4 |

**Descricao:**
O guard de autenticacao e implementado como um NestJS Guard com estrategia plugavel via injecao de dependencia:

```typescript
interface AuthStrategy {
  validate(token: string): Promise<UserClaims | null>;
  getLoginUrl(): string;
}
```

**Estrategias suportadas (via env AUTH_STRATEGY):**

| Estrategia | Uso | Validacao |
|------------|-----|-----------|
| `bypass` | Desenvolvimento | Sempre retorna user mock |
| `jwt` | JWT generico | Valida assinatura + claims |
| `oauth2` | OAuth2/OIDC externo | Valida com provedor (VITE_OAUTH_PORTAL_URL) |
| `custom` | Implementacao cliente | Interface AuthStrategy customizada |

---

## RN012-02 — Protecao Total de Rotas

| Campo | Valor |
|-------|-------|
| **ID** | RN012-02 |
| **Tipo** | Autorizacao |
| **Passos** | Passo 2 |

**Descricao:**
Nenhuma rota e publica. O guard e aplicado globalmente:

- **HTTP**: Guard global no NestJS (`APP_GUARD`)
- **WebSocket**: Validacao no handshake do tRPC WS adapter
- **Nginx**: Proxy reverso nao expoe backend diretamente

Excecoes:
- `/health` e `/ready` para probes de container (sem dados sensiveis)

---

## RN012-03 — Claims Minimos do Token

| Campo | Valor |
|-------|-------|
| **ID** | RN012-03 |
| **Tipo** | Validacao |
| **Passos** | Passo 5 |

**Descricao:**
O token deve conter no minimo:

```typescript
interface UserClaims {
  sub: string;         // userId unico
  name?: string;       // nome exibicao (opcional)
  roles?: string[];    // roles para autorizacao futura (opcional)
  exp?: number;        // expiracao Unix timestamp (opcional)
}
```

O campo `sub` e obrigatorio e usado como chave de sessao (UC011).
