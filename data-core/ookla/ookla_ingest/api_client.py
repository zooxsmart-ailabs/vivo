from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Any, ClassVar, Iterable

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from .settings import settings

log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class FileEntry:
    name: str
    remote_path: str
    url: str
    size: int | None
    mtime: datetime | None

    @property
    def is_dir(self) -> bool:
        return False


@dataclass(frozen=True, slots=True)
class DirEntry:
    name: str
    remote_path: str
    url: str

    @property
    def is_dir(self) -> bool:
        return True


class OoklaApiError(Exception):
    pass


class OoklaFileExpired(OoklaApiError):
    """Arquivo catalogado anteriormente sumiu da API (janela rolante).

    Acontece tipicamente quando o catalogo foi gerado dias atras e a Ookla
    rotacionou/regenerou a estrutura. O loader trata como 'skipped' sem
    incrementar attempts, ja que retentar nao adianta.
    """


class OoklaApiClient:
    """Cliente fino sobre a Speedtest Intelligence Extracts API.

    A API devolve URLs assinadas temporárias para arquivos. Por isso o cliente
    expõe `resolve_file_url()` — chame imediatamente antes do download para
    pegar a URL fresca da pasta-pai.
    """

    # Cache compartilhado entre instancias (loader cria uma instancia por
    # worker thread). Sem isso, N arquivos do mesmo dia disparam N listagens
    # identicas da pasta-pai — para Performance/MobileNetworkPerformance/
    # isso e' literalmente N==files_do_dia HTTPs redundantes. TTL curto pra
    # nao mascarar arquivos novos que apareceram durante a corrida.
    _DIR_CACHE_TTL: ClassVar[float] = 60.0
    _dir_cache: ClassVar[dict[str, tuple[float, list]]] = {}
    _dir_cache_lock: ClassVar[threading.Lock] = threading.Lock()

    def __init__(self, base_url: str | None = None) -> None:
        self._base = (base_url or settings.OOKLA_API_URL).rstrip("/")
        self._client = httpx.Client(
            auth=httpx.BasicAuth(settings.OOKLA_USERNAME, settings.OOKLA_PASSWORD),
            headers={"Accept": "application/json"},
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            follow_redirects=True,
        )

    def __enter__(self) -> "OoklaApiClient":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    def close(self) -> None:
        self._client.close()

    @retry(
        retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
        wait=wait_exponential(multiplier=1, min=1, max=20),
        stop=stop_after_attempt(5),
        reraise=True,
    )
    def _get_json(self, url: str) -> Any:
        resp = self._client.get(url)
        if resp.status_code in (401, 403):
            raise OoklaApiError(
                f"Auth failed ({resp.status_code}) at {url}. Verifique OOKLA_USERNAME/OOKLA_PASSWORD."
            )
        resp.raise_for_status()
        return resp.json()

    def list_dir(self, dir_url: str | None = None) -> list[FileEntry | DirEntry]:
        """Lista entries de uma pasta.

        Sem `dir_url`, lista a raiz. `remote_path` aqui é só o nome do entry
        normalizado (sem barra) — a hierarquia lógica é montada por `walk()`.
        """
        url = dir_url or self._base
        entries = self._get_json(url)
        out: list[FileEntry | DirEntry] = []
        for e in entries:
            absolute = self._absolute(e["url"])
            # A API devolve `name` com '/' final para diretórios.
            name = e["name"].rstrip("/")
            if e["type"] == "dir":
                out.append(DirEntry(name=name, remote_path=name, url=absolute))
            else:
                # Para FILES, e["url"] vem assinada (JWT no path) e expira.
                # Não confiar em e["url"] como identidade — usar nome + hierarquia.
                out.append(
                    FileEntry(
                        name=name,
                        remote_path=name,  # `walk()` substitui pelo path lógico completo
                        url=absolute,
                        size=e.get("size"),
                        mtime=_parse_mtime(e.get("mtime")),
                    )
                )
        return out

    def walk(
        self, prefixes: Iterable[str] | None = None
    ) -> Iterable[FileEntry]:
        """Itera todos os arquivos sob os prefixos, montando o path lógico.

        URLs de DIRETÓRIO são determinísticas (sem JWT). URLs de ARQUIVO são
        assinadas e voláteis. Por isso o `remote_path` retornado aqui é
        construído a partir da hierarquia (independente da URL assinada do arquivo).
        """
        # seeds: (logical_parent_path, dir_url)
        seeds: list[tuple[str, str]] = []
        if prefixes is None:
            seeds.append(("", self._base))
        else:
            wanted = set(prefixes)
            for entry in self.list_dir():
                if entry.is_dir and entry.name in wanted:
                    seeds.append((entry.name, entry.url))

        while seeds:
            logical, url = seeds.pop()
            for entry in self.list_dir(url):
                child_logical = (
                    f"{logical}/{entry.name}" if logical else entry.name
                )
                if entry.is_dir:
                    seeds.append((child_logical, entry.url))
                else:
                    assert isinstance(entry, FileEntry)
                    yield FileEntry(
                        name=entry.name,
                        remote_path=child_logical,  # path lógico completo
                        url=entry.url,
                        size=entry.size,
                        mtime=entry.mtime,
                    )

    def _list_dir_cached(self, dir_url: str) -> list[FileEntry | DirEntry]:
        """`list_dir` com cache TTL compartilhado entre threads/instancias.

        Pequena janela de race: dois workers podem perder o cache em paralelo
        e disparar dois GETs concorrentes — aceito (correto, so' desperdicio
        breve no warm-up). Sem cache stampede prevention de proposito: o
        complica vs. ganho marginal nao compensa nesta carga (pico de N=4
        downloads paralelos por dia).
        """
        now = time.monotonic()
        with self._dir_cache_lock:
            cached = self._dir_cache.get(dir_url)
            if cached is not None and (now - cached[0]) < self._DIR_CACHE_TTL:
                return cached[1]
        entries = self.list_dir(dir_url)
        with self._dir_cache_lock:
            self._dir_cache[dir_url] = (time.monotonic(), entries)
        return entries

    def invalidate_dir_cache(self, dir_url: str | None = None) -> None:
        """Limpa cache de listagem. Sem argumento, limpa tudo."""
        with self._dir_cache_lock:
            if dir_url is None:
                self._dir_cache.clear()
            else:
                self._dir_cache.pop(dir_url, None)

    def resolve_file_url(self, remote_path: str) -> str:
        """Re-resolve a URL assinada de um arquivo listando a pasta-pai.

        `remote_path` é o caminho lógico (ex.:
        `Performance/MobileNetworkPerformance/MobileNetworkPerformance_53018_2026-04-28.parquet`
        ou
        `ConsumerQoE/QoELatency/53021/53021_2026-04-18/<uuid>`). URLs de
        diretório são determinísticas, então construímos a URL pai a partir
        do path lógico.
        """
        norm = remote_path.strip("/")
        parent, _, file_name = norm.rpartition("/")
        if not parent:
            raise OoklaApiError(f"remote_path sem diretorio pai: {remote_path}")
        parent_url = f"{self._base}/{parent}/"
        try:
            entries = self._list_dir_cached(parent_url)
        except httpx.HTTPStatusError as e:
            if e.response is not None and e.response.status_code == 404:
                raise OoklaFileExpired(
                    f"diretorio pai sumiu da API: {parent}"
                ) from e
            raise
        for entry in entries:
            if entry.name == file_name and not entry.is_dir:
                return entry.url
        raise OoklaFileExpired(
            f"arquivo sumiu da API (janela rolante? regeneracao?): {remote_path}"
        )

    def stream_download(self, url: str) -> httpx.Response:
        """Devolve uma response em streaming. O caller deve usar como context manager."""
        return self._client.stream("GET", url)

    def _absolute(self, url: str) -> str:
        if url.startswith("http://") or url.startswith("https://"):
            return url
        return f"{self._base}{url if url.startswith('/') else '/' + url}"


def _parse_mtime(raw: object) -> datetime | None:
    if raw is None:
        return None
    # A API Ookla devolve mtime como epoch (int/float) ou ISO 8601 (string).
    if isinstance(raw, (int, float)):
        try:
            from datetime import timezone

            secs = float(raw)
            # API Ookla usa epoch em milissegundos. 10**12 ≈ 2001 em segundos
            # vs 1970 em milissegundos — se for grande, dividir por 1000.
            if secs > 10**11:
                secs /= 1000.0
            return datetime.fromtimestamp(secs, tz=timezone.utc)
        except (OverflowError, OSError, ValueError):
            log.warning("mtime epoch invalido: %r", raw)
            return None
    if isinstance(raw, str):
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            log.warning("mtime ISO nao parseavel: %r", raw)
            return None
    log.warning("mtime tipo inesperado: %r", raw)
    return None
