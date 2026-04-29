from datetime import date

from ookla_ingest.path_parser import parse


def test_performance_mobile():
    p = parse(
        "Performance/MobileNetworkPerformance/MobileNetworkPerformance_53018_2026-04-28.parquet"
    )
    assert p is not None
    assert p.entity == "MobileNetworkPerformance"
    assert p.data_date == date(2026, 4, 28)


def test_performance_fixed():
    p = parse(
        "Performance/FixedNetworkPerformance/FixedNetworkPerformance_53018_2025-12-31.parquet"
    )
    assert p is not None
    assert p.entity == "FixedNetworkPerformance"
    assert p.data_date == date(2025, 12, 31)


def test_qoe_file_transfer():
    p = parse(
        "ConsumerQoE/FileTransfer/53020/53020_2026-02-22/file_transfer_2026-02-22.csv.gz"
    )
    assert p is not None
    assert p.entity == "FileTransfer"
    assert p.data_date == date(2026, 2, 22)


def test_qoe_video():
    p = parse("ConsumerQoE/QoEVideo/12345/12345_2026-04-01/video.csv.gz")
    assert p is not None
    assert p.entity == "QoEVideo"
    assert p.data_date == date(2026, 4, 1)


def test_qoe_latency():
    p = parse("ConsumerQoE/QoELatency/9999/9999_2026-04-28/latency.csv")
    assert p is not None
    assert p.entity == "QoELatency"
    assert p.data_date == date(2026, 4, 28)


def test_qoe_web_browsing():
    p = parse("ConsumerQoE/WebBrowsing/777/777_2025-11-30/web.csv.gz")
    assert p is not None
    assert p.entity == "WebBrowsing"
    assert p.data_date == date(2025, 11, 30)


def test_unsupported_entity_returns_none():
    assert (
        parse(
            "Performance/UnknownEntity/UnknownEntity_53018_2026-04-28.parquet"
        )
        is None
    )
    assert parse("ConsumerQoE/Foobar/53020/53020_2026-02-22/file.csv") is None


def test_outside_target_prefixes_returns_none():
    assert parse("Speedtest/something/file_2026-04-28.parquet") is None
    assert parse("Coverage/Score/file_2026-04-28.parquet") is None


def test_malformed_paths_return_none():
    # Performance sem data no nome
    assert (
        parse("Performance/MobileNetworkPerformance/MobileNetworkPerformance.parquet")
        is None
    )
    # mes 13 invalido — date() levantaria ValueError, parser captura
    assert (
        parse("ConsumerQoE/FileTransfer/53020/53020_2026-13-22/file.csv") is None
    )


def test_leading_slash_is_tolerated():
    p = parse(
        "/Performance/MobileNetworkPerformance/MobileNetworkPerformance_53018_2026-04-28.parquet"
    )
    assert p is not None and p.data_date == date(2026, 4, 28)
