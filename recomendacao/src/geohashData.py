from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


#  Tipos 


@dataclass
class OperatorScore:
    name: str
    score: float


@dataclass
class MarketShare:
    percentage: float


@dataclass
class ShareTrend:
    direction: str  # "UP" | "DOWN" | "STABLE"
    delta: float


@dataclass
class Crm:
    deviceTier: str  # "Premium" | "Mid" | "Basic"


@dataclass
class Speedtest:
    downloadMbps: float
    latencyMs: float
    qualityLabel: str  # "Excelente" | "Bom" | "Regular" | "Ruim"


@dataclass
class Demographics:
    avgIncome: float
    incomeLabel: str  # "Alto" | "Médio-Alto" | "Médio" | "Baixo"


@dataclass
class Camada2Fibra:
    classification: str  # "AUMENTO_CAPACIDADE" | "EXPANSAO_NOVA_AREA" | "SAUDAVEL"


@dataclass
class Camada2Movel:
    classification: str  # "MELHORA_QUALIDADE" | "SAUDAVEL" | "EXPANSAO_5G" | "EXPANSAO_4G"


@dataclass
class Camada2:
    fibra: Camada2Fibra
    movel: Camada2Movel
    decisaoIntegrada: str


@dataclass
class GeohashData:
    id: str
    neighborhood: str
    city: str
    quadrant: str  # "GROWTH" | "UPSELL" | "GROWTH_RETENCAO" | "RETENCAO"
    technology: str  # "FIBRA" | "MOVEL" | "AMBOS"
    satisfactionScores: list[OperatorScore]
    marketShare: MarketShare
    shareTrend: ShareTrend
    crm: Optional[Crm] = None
    speedtest: Optional[Speedtest] = None
    demographics: Optional[Demographics] = None
    camada2: Optional[Camada2] = None


#  load a partir do JSON 


_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "geohashes.json"


def _parse_geohash(raw: dict) -> GeohashData:
    return GeohashData(
        id=raw["id"],
        neighborhood=raw["neighborhood"],
        city=raw["city"],
        quadrant=raw["quadrant"],
        technology=raw["technology"],
        satisfactionScores=[OperatorScore(**s) for s in raw["satisfactionScores"]],
        marketShare=MarketShare(**raw["marketShare"]),
        shareTrend=ShareTrend(**raw["shareTrend"]),
        crm=Crm(**raw["crm"]) if raw.get("crm") else None,
        speedtest=Speedtest(**raw["speedtest"]) if raw.get("speedtest") else None,
        demographics=Demographics(**raw["demographics"]) if raw.get("demographics") else None,
        camada2=(
            Camada2(
                fibra=Camada2Fibra(**raw["camada2"]["fibra"]),
                movel=Camada2Movel(**raw["camada2"]["movel"]),
                decisaoIntegrada=raw["camada2"]["decisaoIntegrada"],
            )
            if raw.get("camada2")
            else None
        ),
    )


def _load() -> list[GeohashData]:
    with _DATA_PATH.open(encoding="utf-8") as fh:
        raw_list = json.load(fh)
    return [_parse_geohash(r) for r in raw_list]


GEOHASH_DATA: list[GeohashData] = _load()


#  Utilitarios de busca/listagem 


def find_by_id(geohash_id: str) -> Optional[GeohashData]:
    """Retorna o geohash com o ID informado, ou None se nao encontrado."""
    for g in GEOHASH_DATA:
        if g.id == geohash_id:
            return g
    return None


def list_available() -> list[tuple[str, str, str]]:
    """Retorna [(id, neighborhood, quadrant), ...] para uso em listagens."""
    return [(g.id, g.neighborhood, g.quadrant) for g in GEOHASH_DATA]
