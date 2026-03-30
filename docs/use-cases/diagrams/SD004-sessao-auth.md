# SD004 — Sessão e Autenticação

**UCs Referenciados:** [UC011](../UC011-persistir-sessao/UC011-main-flow.md), [UC012](../UC012-autenticar-usuario/UC012-main-flow.md)

**Atores/Sistemas envolvidos:** Analista, Nuxt Frontend, NestJS Backend, Redis, PostgreSQL, Provedor Auth Externo

---

```mermaid
sequenceDiagram
    box rgb(219, 234, 254) Usuário
        participant U as Analista
    end
    box rgb(220, 252, 231) Frontend (Nuxt)
        participant APP as App Shell
    end
    box rgb(254, 243, 199) Backend (NestJS)
        participant GRD as Auth Guard
        participant WS as tRPC WS Router
        participant SES as SessionService
    end
    box rgb(243, 232, 255) Auth Externo
        participant AUTH as Provedor OAuth/JWT
    end
    box rgb(252, 231, 243) Dados
        participant REDIS as Redis
        participant DB as PostgreSQL
    end

    Note over U,DB: UC012 — Autenticação

    U->>APP: Acessa aplicacao
    APP->>GRD: GET / (com token no cookie/header)
    GRD->>GRD: Extrai token
    alt AUTH_STRATEGY=bypass
        GRD->>GRD: Retorna user mock
    else AUTH_STRATEGY=jwt/oauth2
        GRD->>REDIS: GET auth:token:{hash}
        alt Token no cache
            REDIS-->>GRD: UserClaims (validado previamente)
        else Token nao no cache
            GRD->>AUTH: Valida token (HTTP/JWKS)
            AUTH-->>GRD: UserClaims ou 401
            GRD->>REDIS: SET auth:token:{hash} TTL 5min
        end
    end
    GRD-->>APP: 200 OK + UserClaims
    APP->>APP: Inicializa aplicacao

    APP->>WS: WS handshake (token no query)
    WS->>GRD: Valida token WS
    GRD-->>WS: UserClaims
    WS->>WS: Associa userId ao socket

    Note over U,DB: UC011 — Restaurar Sessão

    APP->>WS: session.load({ userId })
    WS->>SES: loadSession(userId)
    SES->>REDIS: GET session:{userId}
    alt Redis HIT
        REDIS-->>SES: SessionState
    else Redis MISS
        SES->>DB: SELECT state FROM user_session WHERE user_id = ?
        alt PG HIT
            DB-->>SES: SessionState (JSON)
            SES->>REDIS: SET session:{userId} TTL 30d
        else PG MISS
            SES-->>SES: Retorna defaults (RN011-02)
        end
    end
    SES-->>WS: SessionState
    WS-->>APP: SessionState
    APP->>APP: Restaura aba, mapa, filtros, selecoes

    Note over U,DB: UC011 — Persistir Sessão (automático)

    U->>APP: Interage (muda filtro, seleciona geohash, etc.)
    APP->>APP: Debounce 2s
    APP->>WS: session.save({ userId, state })
    WS->>SES: saveSession(userId, state)
    SES->>REDIS: SET session:{userId} TTL 30d
    SES->>DB: UPSERT user_session SET state=? WHERE user_id=?
    SES-->>WS: OK
```

## Notas do Diagrama

- **Passos 1-14:** UC012 — fluxo de autenticação com cache de token no Redis.
- **Passos 16-18:** Handshake WS valida token para associar socket ao userId.
- **Passos 20-32:** UC011 restauração — cascata Redis -> PG -> defaults.
- **Passos 34-41:** UC011 persistência — debounce 2s, dupla escrita Redis + PG.
- O cache de token (5min TTL) reduz chamadas ao provedor externo.
- A sessão (30d TTL) garante continuidade entre visitas.
