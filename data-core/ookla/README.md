# Ookla Ingestion

Pipeline em duas fases para ingerir dados Ookla (Speedtest Intelligence) no
S3 e Postgres da Vivo. Substitui o fluxo monolítico em
[tools/speedtest-tools/get-extracts/get-extracts_v2.py](../../tools/speedtest-tools/get-extracts/get-extracts_v2.py).

## Fases

1. **`catalog`** — caminha por **toda** a árvore da API e popula
   `ookla_catalog` com `(entity, data_date, remote_path, file_size,
   remote_mtime, status)`. Cobre tanto entidades alvo quanto auxiliares
   (Coverage, SignalScans, dsar_reports, etc.). **Não baixa nada.**
2. **`load`** — para cada arquivo (em ordem cronológica, por dia):
   1. Download local
   2. Upload para `s3://{bucket}/{prefix}/{YYYY-MM-DD}/{entity}/{filename}`
   3. Se entidade for **alvo**: COPY parquet → tabela Postgres correspondente
   4. Delete do arquivo local

URL assinada da API é re-resolvida just-in-time a cada download (URLs Ookla expiram).

## Entidades

| Diretório API                          | S3 entity dir              | Tabela Postgres              | Default |
| -------------------------------------- | -------------------------- | ---------------------------- | ------- |
| `Performance/MobileNetworkPerformance` | `MobileNetworkPerformance` | `"networkPerformanceMobile"` | ✅ load |
| `Performance/FixedNetworkPerformance`  | `FixedNetworkPerformance`  | `"networkPerformanceFixed"`  | ✅ load |
| `ConsumerQoE/FileTransfer`             | `FileTransfer`             | `file_transfer`              | ✅ load |
| `ConsumerQoE/QoEVideo`                 | `QoEVideo`                 | `video`                      | ✅ load |
| `ConsumerQoE/WebBrowsing`              | `WebBrowsing`              | `web_browsing`               | ✅ load |
| `ConsumerQoE/QoELatency`               | `QoELatency`               | `qoe_latency`                | ⚠️ opt-in |
| `Coverage/`, `SignalScans/`, ...       | (preserva entity-name)     | —                            | só S3   |

`QoELatency` é opt-in via `--include-latency` (default desligado, dado o
volume — ~7M linhas por arquivo, ~30 arquivos por dia).

## Quickstart

Pré-requisitos:
- Migrations 0025 + 0026 aplicadas no DB alvo (`data-viz/apps/api/drizzle/`).
- `data-core/.env` preenchido (ver `.env.example`).
- Auth AWS via SSO (ou estática) no host.

```bash
cd data-core

# 0) AWS credentials → env (necessário antes de subir o container)
eval "$(aws configure export-credentials --format env)"

# 1) Catálogo — descobre TODOS os arquivos disponíveis
docker compose --profile ookla up --build ookla-ingest

# 2) Load (5 entidades, sem latency)
docker compose --profile ookla run --rm ookla-ingest \
  python -m ookla_ingest load

# 2b) Load incluindo 1 dia de QoELatency
docker compose --profile ookla run --rm ookla-ingest \
  python -m ookla_ingest load --include-latency --latency-days 1

# Status
docker compose --profile ookla run --rm ookla-ingest \
  python -m ookla_ingest status

# Sniff (debug — schema parquet de uma entidade)
docker compose --profile ookla run --rm ookla-ingest \
  python -m ookla_ingest sniff --entity QoELatency

# Re-tentativa de arquivos failed
docker compose --profile ookla run --rm ookla-ingest \
  python -m ookla_ingest load --retry-failed
```

## Variáveis de ambiente

| Var                        | Default            | Função                                                        |
| -------------------------- | ------------------ | ------------------------------------------------------------- |
| `OOKLA_USERNAME`           | — (obrigatório)    | API key Ookla (Basic auth user)                               |
| `OOKLA_PASSWORD`           | — (obrigatório)    | API token Ookla (JWT)                                         |
| `OOKLA_PARALLEL_DOWNLOADS` | `4`                | downloads concorrentes por dia                                |
| `OOKLA_MAX_ATTEMPTS`       | `5`                | tentativas por arquivo antes de `failed` permanente           |
| `OOKLA_S3_BUCKET`          | `zoox-vivo-raw`    | bucket destino                                                |
| `OOKLA_S3_PREFIX`          | `ookla`            | prefixo dentro do bucket                                      |
| `AWS_REGION`               | `us-east-1`        | região AWS                                                    |
| `AWS_ACCESS_KEY_ID`        | — (export do CLI)  | credencial AWS — passe via `aws configure export-credentials` |
| `AWS_SECRET_ACCESS_KEY`    | — (export do CLI)  | "                                                             |
| `AWS_SESSION_TOKEN`        | — (export do CLI)  | (SSO/STS apenas)                                              |
| `DATABASE_HOST`            | — (obrigatório)    | host Postgres                                                 |
| `DATABASE_PORT`            | `5432`             | porta Postgres                                                |
| `DATABASE_USER`            | — (obrigatório)    | user Postgres                                                 |
| `DATABASE_PASSWORD`        | — (obrigatório)    | senha Postgres                                                |
| `DATABASE_NAME`            | — (obrigatório)    | DB Postgres                                                   |

> **Volumetria.** Arquivos vêm em **Apache Parquet** (50–300 MB cada). Cada
> arquivo é deletado localmente assim que termina o S3 + Postgres, então o
> volume `ookla-raw` segura no máximo o pico de downloads paralelos do dia.

> **Credenciais SSO.** Sessões AWS SSO duram ~1h. Re-exporte via
> `eval "$(aws configure export-credentials --format env)"` antes de cada
> execução longa.

## Estrutura

```
ookla_ingest/
├── api_client.py     # httpx + Basic auth + retry; resolve_file_url() refresca URL
├── catalog.py        # Fase 1 — popula ookla_catalog (todas as entidades)
├── copy_loader.py    # COPY parquet → Postgres via pyarrow
├── db.py             # connect/open_run/close_run com SET temp_buffers
├── downloader.py     # streaming download
├── loader.py         # Fase 2 — orquestra download → S3 → Postgres → delete
├── path_parser.py    # extrai (entity, data_date) dos paths
├── s3_uploader.py    # boto3 + idempotência via head_object
├── schema.py         # mapping entidade → tabela/case/key
├── settings.py       # pydantic-settings
├── sniff.py          # baixa 1 arquivo, imprime schema + amostra
└── __main__.py       # CLI Click
```

## Operação

- **URLs voláteis**: nunca persistir `url` em `ookla_catalog`. Re-resolução
  just-in-time via `api_client.resolve_file_url()` em cada download.
- **Idempotência S3**: `S3Uploader.upload()` faz `HEAD` antes; pula se key
  existe com mesmo tamanho.
- **Idempotência Postgres**: ausente no COPY (sem staging/ON CONFLICT pois
  estourava `temp_buffers` em hypertables grandes). Garantida pelo estado em
  `ookla_catalog` (`status='loaded'` impede reprocessamento).
- **Colunas extras no parquet**: descartadas com warning quando não existem
  na tabela alvo. Ookla pode adicionar colunas; carga não falha por isso.
- **`status='failed'` permanente**: após `OOKLA_MAX_ATTEMPTS` tentativas.
  Para forçar nova tentativa via SQL:
  ```sql
  UPDATE ookla_catalog SET status='catalogued', attempts=0
   WHERE entity='QoEVideo' AND remote_path = '...';
  ```

## Tests

```bash
cd data-core/ookla
pip install -r requirements.txt pytest
PYTHONPATH=. python -m pytest tests/
```
