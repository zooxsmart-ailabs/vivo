"""Ookla Speedtest Intelligence — ingestion pipeline (catalog + day-by-day load).

Fluxo em duas fases:
  1. catalog — caminha pela API e popula `ookla_catalog` (sem downloads).
  2. load    — itera dia-a-dia cross-entidade, baixa, faz COPY no Postgres.
"""

__all__ = ["__version__"]
__version__ = "0.1.0"
