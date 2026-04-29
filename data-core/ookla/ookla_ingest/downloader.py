from __future__ import annotations

import logging
import os
from pathlib import Path

from .api_client import OoklaApiClient
from .settings import settings

log = logging.getLogger(__name__)

_CHUNK = 1 << 20  # 1 MiB


def local_path_for(remote_path: str) -> Path:
    return Path(settings.OOKLA_RAW_DIR) / remote_path


def download(api: OoklaApiClient, remote_path: str) -> Path:
    """Baixa o arquivo cuja URL assinada é re-resolvida agora.

    Retorna o caminho local. Se o arquivo já existe e tem o tamanho esperado,
    devolve sem re-baixar (idempotência local — útil pra reruns no mesmo dia
    sem precisar marcar `loaded` antes).
    """
    target = local_path_for(remote_path)
    target.parent.mkdir(parents=True, exist_ok=True)

    url = api.resolve_file_url(remote_path)
    tmp = target.with_suffix(target.suffix + ".part")

    log.info("baixando %s", remote_path)
    with api.stream_download(url) as resp:
        resp.raise_for_status()
        with open(tmp, "wb") as f:
            for chunk in resp.iter_bytes(_CHUNK):
                f.write(chunk)

    os.replace(tmp, target)
    return target


def purge(remote_path: str) -> None:
    target = local_path_for(remote_path)
    try:
        target.unlink()
    except FileNotFoundError:
        return
    # Remove diretórios vazios subindo até OOKLA_RAW_DIR (sem sair).
    raw = Path(settings.OOKLA_RAW_DIR).resolve()
    parent = target.parent.resolve()
    while parent != raw and parent.is_relative_to(raw):
        try:
            parent.rmdir()
        except OSError:
            break
        parent = parent.parent
