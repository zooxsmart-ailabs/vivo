"""
Uso:
    python geohashSummary.py <geohash_id>       # modo direto
    python geohashSummary.py                    # modo interativo (lista geohashes)
    python geohashSummary.py <id> --debug-prompt  # imprime o prompt sem chamar LLM
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal, Optional


# Import dinamico

_SRC_DIR = Path(__file__).resolve().parent


def _load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, _SRC_DIR / filename)
    if spec is None or spec.loader is None:
        raise ImportError(f"Nao foi possivel carregar {filename}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


_bt = _load_module("benchmark_thresholds", "benchmark-thresholds.py")
_gd = _load_module("geohash_data", "geohashData.py")

BenchmarkThresholds = _bt.BenchmarkThresholds
DEFAULT_BENCHMARKS = _bt.DEFAULT_BENCHMARKS
GeohashData = _gd.GeohashData
GEOHASH_DATA = _gd.GEOHASH_DATA
find_by_id = _gd.find_by_id
list_available = _gd.list_available


#  Tipos do pre-processamento 

Classificacao = Literal["ACIMA", "ABAIXO", "NA_MEDIA"]


@dataclass
class Comparacoes:
    satisfacao: Optional[Classificacao] = None
    share: Optional[Classificacao] = None
    renda: Optional[Classificacao] = None
    tendencia: Optional[Classificacao] = None


@dataclass
class SummaryInput:
    bairro: str
    cidade: str
    quadrant: str
    technology: str
    satisfacaoVivo: Optional[str]
    shareFormatado: Optional[str]
    downloadFormatado: Optional[str]
    latenciaFormatada: Optional[str]
    qualidadeRede: Optional[str]
    rendaFormatada: Optional[str]
    tendenciaFormatada: Optional[str]
    fibraClassification: Optional[str]
    movelClassification: Optional[str]
    decisaoIntegrada: Optional[str]
    perfilRegiao: Optional[str]
    comparacoes: Comparacoes
    benchmarks: "BenchmarkThresholds"


#  Helpers 


def classificar(valor: float, limite_alto: float, limite_baixo: float) -> Classificacao:
    if valor >= limite_alto:
        return "ACIMA"
    if valor < limite_baixo:
        return "ABAIXO"
    return "NA_MEDIA"


def classificar_tendencia(delta: float, trend_up: float, trend_down: float) -> Classificacao:
    if delta >= trend_up:
        return "ACIMA"
    if delta <= trend_down:
        return "ABAIXO"
    return "NA_MEDIA"


def format_currency_brl(value: float) -> str:
    """Formata BRL usando '.' como separador(R$10.000)."""
    # Evita dependencia de locale do SO.
    n = int(round(value))
    formatted = f"{n:,}".replace(",", ".")
    return f"R${formatted}"


def inferir_perfil_regiao(data: GeohashData) -> Optional[str]:
    if data.demographics is None:
        return None

    perfil_base_map = {
        "Alto": "alta renda",
        "Médio-Alto": "renda media-alta",
        "Médio": "renda intermediaria",
        "Baixo": "perfil popular",
    }
    base = perfil_base_map.get(data.demographics.incomeLabel)
    if base is None:
        return None

    if data.crm is not None:
        consumo_map = {
            "Premium": "consumo premium",
            "Mid": "consumo moderado",
            "Basic": "consumo economico",
        }
        consumo = consumo_map.get(data.crm.deviceTier)
        if consumo:
            return f"{base}, {consumo}"

    return base


def extract_summary_input(data: GeohashData, benchmarks: BenchmarkThresholds) -> SummaryInput:
    vivo_score = next((s for s in data.satisfactionScores if s.name == "VIVO"), None)
    vivo_score_value = vivo_score.score if vivo_score is not None else None

    satisfacao_class: Optional[Classificacao] = (
        classificar(vivo_score_value, benchmarks.satisfacaoAlta, benchmarks.satisfacaoBaixa)
        if vivo_score_value is not None
        else None
    )
    renda_class: Optional[Classificacao] = (
        classificar(data.demographics.avgIncome, benchmarks.rendaAlta, benchmarks.rendaBaixa)
        if data.demographics is not None
        else None
    )

    trend_delta = data.shareTrend.delta
    tendencia_sign = "+" if trend_delta > 0 else ""
    tendencia_formatada = f"{data.shareTrend.direction} ({tendencia_sign}{trend_delta}pp)"

    return SummaryInput(
        bairro=data.neighborhood,
        cidade=data.city,
        quadrant=data.quadrant,
        technology=data.technology,
        satisfacaoVivo=f"{vivo_score_value}/10" if vivo_score_value is not None else None,
        shareFormatado=f"{data.marketShare.percentage}%",
        downloadFormatado=(
            f"{data.speedtest.downloadMbps} Mbps" if data.speedtest is not None else None
        ),
        latenciaFormatada=(
            f"{data.speedtest.latencyMs}ms" if data.speedtest is not None else None
        ),
        qualidadeRede=data.speedtest.qualityLabel if data.speedtest is not None else None,
        rendaFormatada=(
            format_currency_brl(data.demographics.avgIncome)
            if data.demographics is not None
            else None
        ),
        tendenciaFormatada=tendencia_formatada,
        fibraClassification=data.camada2.fibra.classification if data.camada2 is not None else None,
        movelClassification=data.camada2.movel.classification if data.camada2 is not None else None,
        decisaoIntegrada=data.camada2.decisaoIntegrada if data.camada2 is not None else None,
        perfilRegiao=inferir_perfil_regiao(data),
        comparacoes=Comparacoes(
            satisfacao=satisfacao_class,
            share=classificar(
                data.marketShare.percentage, benchmarks.shareAlto, benchmarks.shareBaixo
            ),
            renda=renda_class,
            tendencia=classificar_tendencia(
                trend_delta, benchmarks.trendUp, benchmarks.trendDown
            ),
        ),
        benchmarks=benchmarks,
    )


#  Prompt

PROMPT_TEMPLATE = """Voce e um analista estrategico de telecomunicacoes. Gere um resumo executivo curto (3 a 6 frases) em portugues brasileiro sobre a area descrita abaixo.

**Dados do Geohash:**
- Bairro: {bairro}, Cidade: {cidade}
- Quadrante estrategico: {quadrant}
- Tecnologia predominante: {technology}
- Share de mercado Vivo: {shareFormatado} (classificacao: {shareClass})
{satisfacaoBlock}
{redeBlock}
{rendaBlock}
{perfilBlock}
- Tendencia de share: {tendenciaFormatada} (classificacao: {tendenciaClass})
{camada2Block}

**Thresholds de referencia:**
- Satisfacao: ACIMA >= {satisfacaoAlta}, ABAIXO < {satisfacaoBaixa}
- Share: ACIMA >= {shareAlto}%, ABAIXO < {shareBaixo}%
- Renda: Alta >= R${rendaAlta}, Baixa < R${rendaBaixa}
- Tendencia: Positiva >= +{trendUp}pp, Negativa <= {trendDown}pp

**Instrucoes:**
1. Classifique explicitamente cada dimensao disponivel como ACIMA, ABAIXO ou NA MEDIA em relacao aos thresholds
2. Use tom executivo e objetivo
3. Mencione o bairro e a cidade no inicio
4. Conclua com uma recomendacao estrategica alinhada ao quadrante:
   - GROWTH = foco em aquisicao de novos clientes
   - UPSELL = foco em cross-sell e upgrade de planos
   - RETENCAO = foco em fidelizacao e reducao de churn
   - GROWTH_RETENCAO = foco em estabilizacao (dupla frente: aquisicao + infraestrutura)
5. Se o perfil da regiao estiver disponivel, incorpore-o naturalmente ao resumo (ex: "area de alta renda com consumo premium")
6. Se algum dado nao estiver disponivel, mencione apenas os dados presentes
7. Escreva entre 3 e 6 frases, sem usar bullet points"""


#  Blocos condicionais


def _build_satisfacao_block(inp: SummaryInput) -> str:
    if inp.satisfacaoVivo is None:
        return "- Satisfacao Vivo: dado nao disponivel"
    return f"- Satisfacao Vivo: {inp.satisfacaoVivo} (classificacao: {inp.comparacoes.satisfacao})"


def _build_rede_block(inp: SummaryInput) -> str:
    if inp.downloadFormatado is None:
        return "- Qualidade de rede: dado nao disponivel"
    return (
        f"- Download: {inp.downloadFormatado}, Latencia: {inp.latenciaFormatada}, "
        f"Qualidade: {inp.qualidadeRede}"
    )


def _build_renda_block(inp: SummaryInput) -> str:
    if inp.rendaFormatada is None:
        return "- Renda media: dado nao disponivel"
    return f"- Renda media: {inp.rendaFormatada} (classificacao: {inp.comparacoes.renda})"


def _build_perfil_block(inp: SummaryInput) -> str:
    if inp.perfilRegiao is None:
        return ""
    return f"- Perfil da regiao: {inp.perfilRegiao}"


def _build_camada2_block(inp: SummaryInput) -> str:
    if inp.fibraClassification is None and inp.movelClassification is None:
        return ""
    parts: list[str] = []
    if inp.fibraClassification:
        parts.append(f"Fibra: {inp.fibraClassification}")
    if inp.movelClassification:
        parts.append(f"Movel: {inp.movelClassification}")
    block = f"- Camada 2 (Infraestrutura): {', '.join(parts)}"
    if inp.decisaoIntegrada:
        block += f"\n- Decisao integrada: {inp.decisaoIntegrada}"
    return block


#  Montagem do prompt


def build_prompt(data: GeohashData, benchmarks: BenchmarkThresholds) -> str:
    """Monta o prompt formatado"""
    from langchain_core.prompts import PromptTemplate

    inp = extract_summary_input(data, benchmarks)
    prompt = PromptTemplate.from_template(PROMPT_TEMPLATE)

    return prompt.format(
        bairro=inp.bairro,
        cidade=inp.cidade,
        quadrant=inp.quadrant,
        technology=inp.technology,
        shareFormatado=inp.shareFormatado,
        shareClass=inp.comparacoes.share,
        satisfacaoBlock=_build_satisfacao_block(inp),
        redeBlock=_build_rede_block(inp),
        rendaBlock=_build_renda_block(inp),
        perfilBlock=_build_perfil_block(inp),
        tendenciaFormatada=inp.tendenciaFormatada,
        tendenciaClass=inp.comparacoes.tendencia,
        camada2Block=_build_camada2_block(inp),
        satisfacaoAlta=inp.benchmarks.satisfacaoAlta,
        satisfacaoBaixa=inp.benchmarks.satisfacaoBaixa,
        shareAlto=inp.benchmarks.shareAlto,
        shareBaixo=inp.benchmarks.shareBaixo,
        rendaAlta=format_currency_brl(inp.benchmarks.rendaAlta).removeprefix("R$"),
        rendaBaixa=format_currency_brl(inp.benchmarks.rendaBaixa).removeprefix("R$"),
        trendUp=inp.benchmarks.trendUp,
        trendDown=inp.benchmarks.trendDown,
    )


#  Funcao de geracao 


def generate_geohash_summary(
    data: GeohashData,
    benchmarks: BenchmarkThresholds = DEFAULT_BENCHMARKS,
) -> str:
    """Gera o resumo executivo chamando o LLM via LangChain."""
    from langchain_openai import ChatOpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY nao configurada. Defina a variavel de ambiente ou "
            "adicione-a ao arquivo .env em vivo/recomendacao/."
        )

    formatted_prompt = build_prompt(data, benchmarks)

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, api_key=api_key)

    try:
        response = llm.invoke(formatted_prompt)
    except Exception as e:
        raise RuntimeError(f"Erro ao gerar resumo do geohash via LLM: {e}") from e

    content = response.content
    return content if isinstance(content, str) else str(content)


#  CLI 


def _interactive_pick() -> str:
    """Lista os geohashes disponiveis e pede ao usuario para escolher um."""
    available = list_available()
    print("\nGeohashes disponiveis:\n")
    width = len(str(len(available)))
    for i, (gid, bairro, quadrant) in enumerate(available, start=1):
        print(f"  [{str(i).rjust(width)}] {gid} — {bairro} ({quadrant})")
    print()

    while True:
        choice = input("Digite o ID do geohash ou o numero da lista: ").strip()
        if not choice:
            continue

        #  como indice numerico
        if choice.isdigit():
            idx = int(choice)
            if 1 <= idx <= len(available):
                return available[idx - 1][0]
            print(f"  Indice fora do intervalo (1-{len(available)}). Tente novamente.")
            continue

        # Tenta como ID direto
        if find_by_id(choice) is not None:
            return choice

        print(f"  ID '{choice}' nao encontrado. Tente novamente.")


def main() -> int:
    # UTF-8 na saida 
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

    parser = argparse.ArgumentParser(
        description="Gera resumo executivo de um geohash usando LangChain + OpenAI.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Exemplos:\n"
            "  python geohashSummary.py 6gyf4b\n"
            "  python geohashSummary.py                    # modo interativo\n"
            "  python geohashSummary.py 6gyf4b --debug-prompt\n"
        ),
    )
    parser.add_argument(
        "geohash_id",
        nargs="?",
        help="ID do geohash (ex: 6gyf4b). Omita para entrar em modo interativo.",
    )
    parser.add_argument(
        "--debug-prompt",
        action="store_true",
        help="Imprime o prompt formatado sem chamar o LLM.",
    )
    args = parser.parse_args()

    #  .env 
    try:
        from dotenv import load_dotenv

        load_dotenv(_SRC_DIR.parent / ".env")
        load_dotenv() 
    except ImportError:
        pass

    geohash_id = args.geohash_id or _interactive_pick()

    data = find_by_id(geohash_id)
    if data is None:
        print(f"Erro: geohash '{geohash_id}' nao encontrado.", file=sys.stderr)
        return 1

    if args.debug_prompt:
        print(build_prompt(data, DEFAULT_BENCHMARKS))
        return 0

    try:
        start = time.perf_counter()
        resumo = generate_geohash_summary(data)
        elapsed = time.perf_counter() - start
    except RuntimeError as e:
        print(f"Erro: {e}", file=sys.stderr)
        return 1

    print(f"\n--- {data.quadrant}: {data.neighborhood} ({data.id}) ---\n")
    print(resumo)
    print(f"\n(Tempo de geracao pela LLM: {elapsed:.2f}s)\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
