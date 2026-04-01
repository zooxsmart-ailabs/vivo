# UC012 — Regras de Negócio

[<- Voltar ao fluxo principal](./UC012-main-flow.md)

## RN012-01 — Estratégia de Autenticação Plugável

| Campo | Valor |
|-------|-------|
| **ID** | RN012-01 |
| **Tipo** | Autorização |
| **Passos** | Passo 4 |

**Descrição:**
O guard de autenticação é implementado como um NestJS Guard com estratégia plugável via injeção de dependência:

```typescript
interface AuthStrategy {
  validate(token: string): Promise<UserClaims | null>;
  getLoginUrl(): string;
}
```

**Estratégias suportadas (via env AUTH_STRATEGY):**

| Estratégia | Uso | Validação |
|------------|-----|-----------|
| `bypass` | Desenvolvimento | Sempre retorna user mock |
| `jwt` | JWT genérico | Valida assinatura + claims |
| `oauth2` | OAuth2/OIDC externo | Valida com provedor (VITE_OAUTH_PORTAL_URL) |
| `custom` | Implementação cliente | Interface AuthStrategy customizada |

---

## RN012-02 — Proteção Total de Rotas

| Campo | Valor |
|-------|-------|
| **ID** | RN012-02 |
| **Tipo** | Autorização |
| **Passos** | Passo 2 |

**Descrição:**
Nenhuma rota é pública. O guard é aplicado globalmente:

- **HTTP**: Guard global no NestJS (`APP_GUARD`)
- **WebSocket**: Validação no handshake do tRPC WS adapter
- **Nginx**: Proxy reverso não expõe backend diretamente

Exceções:
- `/health` e `/ready` para probes de container (sem dados sensíveis)

---

## RN012-03 — Claims Mínimos do Token

| Campo | Valor |
|-------|-------|
| **ID** | RN012-03 |
| **Tipo** | Validação |
| **Passos** | Passo 5 |

**Descrição:**
O token deve conter no mínimo:

```typescript
interface UserClaims {
  sub: string;         // userId único
  name?: string;       // nome exibição (opcional)
  roles?: string[];    // roles para autorização futura (opcional)
  exp?: number;        // expiração Unix timestamp (opcional)
}
```

O campo `sub` é obrigatório e usado como chave de sessão (UC011).
