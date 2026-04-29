from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Final, Literal

NamingCase = Literal["snake", "camel"]


@dataclass(frozen=True, slots=True)
class EntityMap:
    table: str
    case: NamingCase
    key: tuple[str, ...]  # colunas usadas no ON CONFLICT (no nome real da tabela)


# Tabelas QoE seguem snake_case; Performance segue camelCase (entre aspas duplas).
ENTITIES: Final[dict[str, EntityMap]] = {
    "FileTransfer": EntityMap(
        table="file_transfer", case="snake", key=("guid_result", "ts_result")
    ),
    "QoEVideo": EntityMap(
        table="video", case="snake", key=("guid_result", "ts_result")
    ),
    "WebBrowsing": EntityMap(
        table="web_browsing", case="snake", key=("guid_result", "ts_result")
    ),
    "QoELatency": EntityMap(
        table="qoe_latency", case="snake", key=("guid_result", "ts_result")
    ),
    "MobileNetworkPerformance": EntityMap(
        table='"networkPerformanceMobile"',
        case="camel",
        key=('"idResult"', '"tsResult"'),
    ),
    "FixedNetworkPerformance": EntityMap(
        table='"networkPerformanceFixed"',
        case="camel",
        key=('"idResult"', '"tsResult"'),
    ),
}


_CAMEL_BOUNDARY = re.compile(r"_([a-z0-9])")


def snake_to_camel(name: str) -> str:
    """ts_result -> tsResult (não maiúscula a primeira letra)."""
    return _CAMEL_BOUNDARY.sub(lambda m: m.group(1).upper(), name)


def column_for_target(source_column_snake: str, case: NamingCase) -> str:
    """Devolve o nome de coluna a usar na tabela alvo, já quoted se necessário."""
    if case == "snake":
        return source_column_snake
    return f'"{snake_to_camel(source_column_snake)}"'
