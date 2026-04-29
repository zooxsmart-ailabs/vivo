from __future__ import annotations

import io
import logging
from pathlib import Path
from typing import IO, TYPE_CHECKING, Iterator

import boto3
from boto3.s3.transfer import TransferConfig
from botocore.config import Config
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from .path_parser import ParsedPath
from .settings import settings

if TYPE_CHECKING:
    from mypy_boto3_s3.client import S3Client


class IterStream(io.RawIOBase):
    """Adapta `Iterator[bytes]` (ex.: `httpx.Response.iter_bytes()`) numa
    interface file-like que o boto3 consome em `upload_fileobj`.

    boto3 chama `read(n)` repetidamente até EOF; nós acumulamos chunks do
    iterator e fatiamos.
    """

    def __init__(self, chunks: Iterator[bytes]) -> None:
        super().__init__()
        self._chunks = chunks
        self._buf = b""
        self._exhausted = False

    def readable(self) -> bool:  # noqa: D401
        return True

    def read(self, n: int = -1) -> bytes:
        if n < 0:
            tail = [self._buf]
            self._buf = b""
            for c in self._chunks:
                tail.append(c)
            self._exhausted = True
            return b"".join(tail)
        while len(self._buf) < n and not self._exhausted:
            try:
                self._buf += next(self._chunks)
            except StopIteration:
                self._exhausted = True
                break
        out, self._buf = self._buf[:n], self._buf[n:]
        return out

log = logging.getLogger(__name__)


def s3_key_for(remote_path: str, parsed: ParsedPath) -> str:
    """Constroi a key S3 para um arquivo a partir do path lógico Ookla.

    Layout:
      - Com data e entidade: {prefix}/{YYYY-MM-DD}/{entity}/{filename}
      - Sem data:            {prefix}/_undated/{entity}/{filename}

    Quando o `parsed.entity` carrega `_` (ex.: `Coverage_SubArea`), preserva.
    """
    prefix = settings.OOKLA_S3_PREFIX.strip("/")
    file_name = remote_path.rsplit("/", 1)[-1]
    if parsed.data_date is not None:
        return f"{prefix}/{parsed.data_date.isoformat()}/{parsed.entity}/{file_name}"
    return f"{prefix}/_undated/{parsed.entity}/{file_name}"


_TRANSFER_CONFIG = TransferConfig(
    multipart_threshold=8 * 1024 * 1024,
    multipart_chunksize=8 * 1024 * 1024,
    max_concurrency=8,
    use_threads=True,
)


class S3Uploader:
    def __init__(self) -> None:
        self._client: "S3Client" = boto3.client(  # type: ignore[assignment]
            "s3",
            region_name=settings.AWS_REGION,
            config=Config(
                retries={"max_attempts": 5, "mode": "adaptive"},
                connect_timeout=15,
                read_timeout=300,
                max_pool_connections=32,
            ),
        )
        self._bucket = settings.OOKLA_S3_BUCKET

    @property
    def bucket(self) -> str:
        return self._bucket

    @retry(
        retry=retry_if_exception_type(Exception),
        wait=wait_exponential(multiplier=1, min=1, max=20),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    def upload(self, local_path: Path, key: str) -> str:
        """Sobe um arquivo do disco. Idempotente via head_object."""
        s3_uri = f"s3://{self._bucket}/{key}"
        local_size = local_path.stat().st_size
        if self._exists_with_size(key, local_size):
            log.info("S3 ja contem %s (%d bytes) — skip upload", s3_uri, local_size)
            return s3_uri

        self._client.upload_file(
            str(local_path), self._bucket, key, Config=_TRANSFER_CONFIG
        )
        log.info("S3 upload OK: %s (%d bytes)", s3_uri, local_size)
        return s3_uri

    def upload_fileobj(
        self,
        fileobj: IO[bytes],
        key: str,
        *,
        expected_size: int | None = None,
        skip_if_exists: bool = True,
    ) -> str:
        """Sobe um file-like (BytesIO ou IterStream) usando multipart.

        Idempotência opcional: se `expected_size` é conhecido e a key existe
        com esse tamanho, pula upload (para fluxos onde sabemos o tamanho a
        priori, como BytesIO já materializado).
        """
        s3_uri = f"s3://{self._bucket}/{key}"
        if skip_if_exists and expected_size is not None and self._exists_with_size(key, expected_size):
            log.info("S3 ja contem %s (%d bytes) — skip upload", s3_uri, expected_size)
            return s3_uri

        self._client.upload_fileobj(fileobj, self._bucket, key, Config=_TRANSFER_CONFIG)
        log.info(
            "S3 upload OK: %s%s",
            s3_uri,
            f" ({expected_size} bytes)" if expected_size else " (streamed)",
        )
        return s3_uri

    def _exists_with_size(self, key: str, expected_size: int) -> bool:
        try:
            head = self._client.head_object(Bucket=self._bucket, Key=key)
        except self._client.exceptions.ClientError as e:
            code = e.response.get("Error", {}).get("Code", "")
            if code in ("404", "NoSuchKey", "NotFound"):
                return False
            raise
        return int(head.get("ContentLength", -1)) == expected_size
