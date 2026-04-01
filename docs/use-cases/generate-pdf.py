#!/usr/bin/env python3
"""Generate indexed PDF from use case markdown files.

Produces two PDFs (portrait UCs + landscape diagrams) then merges them.
"""
import subprocess
import os
import sys
import re

BASE = os.path.dirname(os.path.abspath(__file__))
PANDOC = os.path.expanduser(
    "~/.virtualenvs/vivo/lib/python3.13/site-packages/pypandoc/files/pandoc"
)

UC_IDS = [
    "UC001-visualizar-mapa-estrategico",
    "UC002-filtrar-por-quadrante",
    "UC003-filtrar-por-tecnologia",
    "UC004-inspecionar-geohash",
    "UC005-drill-down-geoespacial",
    "UC006-filtrar-por-periodo",
    "UC007-comparar-periodos",
    "UC008-filtrar-por-localizacao",
    "UC009-consultar-frente-estrategica",
    "UC010-consultar-visao-bairro",
    "UC011-persistir-sessao",
    "UC012-autenticar-usuario",
]

SUB_FILES = ["main-flow", "alt-flows", "business-rules", "function-points"]

DIAGRAMS = [
    "SD001-navegacao-mapa",
    "SD002-filtros-globais",
    "SD003-frentes-bairros",
    "SD004-sessao-auth",
]


def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def clean_diagram_content(content):
    """Remove outer triple-backtick wrapper that wraps the entire diagram file.

    The diagram files have this structure:
    ```
    # SD001 - Title
    ...
    ```mermaid
    sequenceDiagram
    ...
    ```
    ## Notas
    ...
    ```

    We need to remove the outer ``` wrapper but keep the inner ```mermaid blocks.
    """
    lines = content.split("\n")
    # Remove leading/trailing ``` lines (outer wrapper)
    if lines and lines[0].strip() == "```":
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines)


def build_uc_md():
    """Build the main UC content (portrait pages)."""
    parts = []

    # INDEX
    index_content = read_file(os.path.join(BASE, "INDEX.md"))
    parts.append(index_content)
    parts.append("\n\\newpage\n")

    # Each UC
    for uc_dir in UC_IDS:
        uc_id = uc_dir.split("-")[0]
        for sub in SUB_FILES:
            fpath = os.path.join(BASE, uc_dir, f"{uc_id}-{sub}.md")
            if os.path.exists(fpath):
                content = read_file(fpath)
                lines = content.split("\n")
                filtered = [l for l in lines if not l.strip().startswith("[<- Voltar")]
                parts.append("\n".join(filtered))
                parts.append("\n\\newpage\n")

    return "\n".join(parts)


def build_diagrams_md():
    """Build the diagrams content (will be rendered as landscape)."""
    parts = []

    parts.append("# Diagramas de Sequência\n")

    for diag in DIAGRAMS:
        fpath = os.path.join(BASE, "diagrams", f"{diag}.md")
        if os.path.exists(fpath):
            content = read_file(fpath)
            content = clean_diagram_content(content)
            parts.append(content)
            parts.append("\n\\newpage\n")

    return "\n".join(parts)


def run_pandoc(input_path, output_path, extra_args=None):
    cmd = [
        PANDOC,
        input_path,
        "-o", output_path,
        "--pdf-engine=lualatex",
        "-V", "documentclass=scrreprt",
        "-V", "fontsize=10pt",
        "-V", "lang=pt-BR",
        "-V", "mainfont=Latin Modern Roman",
        "--no-highlight",
        "-f", "markdown+pipe_tables+backtick_code_blocks",
    ]
    if extra_args:
        cmd.extend(extra_args)

    print(f"  pandoc -> {os.path.basename(output_path)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("STDERR:", result.stderr[-2000:])
        raise SystemExit(1)


def main():
    output_pdf = os.path.join(BASE, "casos-de-uso-zoox-vivo.pdf")

    # 1) Build portrait PDF (UCs with TOC)
    uc_md_path = os.path.join(BASE, "_uc.md")
    with open(uc_md_path, "w", encoding="utf-8") as f:
        f.write(build_uc_md())

    uc_pdf = os.path.join(BASE, "_uc.pdf")
    run_pandoc(uc_md_path, uc_pdf, [
        "--toc", "--toc-depth=3",
        "-V", "toc-title=Índice",
        "-V", "geometry:margin=2.5cm",
        "-V", "fontsize=11pt",
        "-V", "title=Casos de Uso — Zoox × Vivo GeoIntelligence",
        "-V", "subtitle=Especificação Funcional v3.0",
        "-V", "date=2026-03-30",
    ])

    # 2) Build landscape PDF (diagrams)
    diag_md_path = os.path.join(BASE, "_diag.md")
    with open(diag_md_path, "w", encoding="utf-8") as f:
        f.write(build_diagrams_md())

    diag_pdf = os.path.join(BASE, "_diag.pdf")
    run_pandoc(diag_md_path, diag_pdf, [
        "-V", "geometry:margin=2cm,landscape",
        "-V", "fontsize=9pt",
    ])

    # 3) Merge PDFs
    # Check for pdftk or pdfunite
    merge_tool = None
    for tool in ["pdfunite", "pdftk"]:
        if subprocess.run(["which", tool], capture_output=True).returncode == 0:
            merge_tool = tool
            break

    if merge_tool == "pdfunite":
        subprocess.run(["pdfunite", uc_pdf, diag_pdf, output_pdf], check=True)
    elif merge_tool == "pdftk":
        subprocess.run(["pdftk", uc_pdf, diag_pdf, "cat", "output", output_pdf], check=True)
    else:
        # Fallback: use Python with PyPDF or just use ghostscript
        gs_result = subprocess.run(
            ["gs", "-dBATCH", "-dNOPAUSE", "-q", "-sDEVICE=pdfwrite",
             f"-sOutputFile={output_pdf}", uc_pdf, diag_pdf],
            capture_output=True, text=True
        )
        if gs_result.returncode != 0:
            print("No PDF merge tool found. Install pdfunite, pdftk, or ghostscript.")
            # Just use the UC pdf as fallback
            os.rename(uc_pdf, output_pdf)
            os.remove(diag_pdf)
            os.remove(uc_md_path)
            os.remove(diag_md_path)
            print(f"PDF generated (without landscape diagrams): {output_pdf}")
            return

    # Clean up temp files
    for f in [uc_pdf, diag_pdf, uc_md_path, diag_md_path]:
        if os.path.exists(f):
            os.remove(f)

    print(f"PDF generated: {output_pdf}")
    print(f"  Size: {os.path.getsize(output_pdf) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
