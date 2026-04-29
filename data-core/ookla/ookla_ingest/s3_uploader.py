from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING

import boto3
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


class S3Uploader:
    def __init__(self) -> None:
        self._client: "S3Client" = boto3.client(  # type: ignore[assignment]
            "s3",
            region_name=settings.AWS_REGION,
            config=Config(
                retries={"max_attempts": 5, "mode": "adaptive"},
                connect_timeout=15,
                read_timeout=300,
            ),
        )
        self._bucket = settings.OOKLA_S3_BUCKET

    @retry(
        retry=retry_if_exception_type(Exception),
        wait=wait_exponential(multiplier=1, min=1, max=20),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    def upload(self, local_path: Path, key: str) -> str:
        """Sobe um arquivo. Retorna `s3://bucket/key`. Idempotente: se a key
        já existe com mesmo tamanho, pula o upload."""
        s3_uri = f"s3://{self._bucket}/{key}"
        local_size = local_path.stat().st_size
        if self._exists_with_size(key, local_size):
            log.info("S3 ja contem %s (%d bytes) — skip upload", s3_uri, local_size)
            return s3_uri

        self._client.upload_file(str(local_path), self._bucket, key)
        log.info("S3 upload OK: %s (%d bytes)", s3_uri, local_size)
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
