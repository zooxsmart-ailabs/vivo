from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date
from typing import Final

# Entidades alvo para load no Postgres (5 com schema, 1 condicional via flag).
ENTITIES_PERFORMANCE: Final = {"MobileNetworkPerformance", "FixedNetworkPerformance"}
ENTITIES_QOE: Final = {"QoELatency", "QoEVideo", "FileTransfer", "WebBrowsing"}
TARGET_ENTITIES: Final = ENTITIES_PERFORMANCE | ENTITIES_QOE

# Regex para entidades com layout conhecido — devolve (entity, data_date).
_PERF_RE = re.compile(
    r"^Performance/(?P<entity>[^/]+)/[^/]+_(?P<y>\d{4})-(?P<m>\d{2})-(?P<d>\d{2})\.[^/]+$"
)
_QOE_RE = re.compile(
    r"^ConsumerQoE/(?P<entity>[^/]+)/[^/]+/[^_/]+_(?P<y>\d{4})-(?P<m>\d{2})-(?P<d>\d{2})/"
)

# Captura YYYY-MM-DD em qualquer ponto do path/nome para entidades fora do
# layout principal (Coverage/, SignalScans/, etc.).
_DATE_FALLBACK = re.compile(r"(?P<y>\d{4})[-_/](?P<m>\d{2})[-_/](?P<d>\d{2})")


@dataclass(frozen=True, slots=True)
class ParsedPath:
    entity: str
    data_date: date | None


def parse(remote_path: str) -> ParsedPath | None:
    """Extrai (entity, data_date) de um path da API Ookla.

    Reconhece tres niveis de qualidade:
      1. Layout conhecido (Performance/QoE) -> entity + date precisos.
      2. Outras entidades (Coverage/, SignalScans/, dsar_reports/, ...) ->
         entity = primeiro segmento + date best-effort via regex de fallback.
      3. Path vazio/sem segmentos -> None.

    Sempre devolve algo que possa ir para o catalogo, exceto para paths
    completamente invalidos.
    """
    norm = remote_path.lstrip("/").replace("\\", "/")
    if not norm:
        return None

    if (m := _PERF_RE.match(norm)) and m["entity"] in ENTITIES_PERFORMANCE:
        return _build(m["entity"], m["y"], m["m"], m["d"])

    if (m := _QOE_RE.match(norm)) and m["entity"] in ENTITIES_QOE:
        return _build(m["entity"], m["y"], m["m"], m["d"])

    # Fallback: primeiro segmento como entidade, data via regex no path/nome
    parts = norm.split("/")
    if not parts:
        return None
    entity = parts[0]
    if len(parts) > 1 and parts[0] in {"Performance", "ConsumerQoE"}:
        # Para Performance/X e ConsumerQoE/X que NAO bateram nos regex acima:
        # combina os dois primeiros segmentos para preservar a entidade real.
        entity = f"{parts[0]}_{parts[1]}"

    if dm := _DATE_FALLBACK.search(norm):
        try:
            return ParsedPath(
                entity=entity,
                data_date=date(int(dm["y"]), int(dm["m"]), int(dm["d"])),
            )
        except ValueError:
            pass
    return ParsedPath(entity=entity, data_date=None)


def _build(entity: str, y: str, m: str, d: str) -> ParsedPath | None:
    try:
        return ParsedPath(entity=entity, data_date=date(int(y), int(m), int(d)))
    except ValueError:
        return None


def is_target_entity(entity: str) -> bool:
    return entity in TARGET_ENTITIES
