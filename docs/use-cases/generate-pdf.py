#!/usr/bin/env python3
"""Generate styled, indexed PDF from use case markdown files.

Uses Markdown → HTML (with custom CSS) → PDF (via Playwright/Chromium).
Mermaid diagrams are rendered client-side by the mermaid.js library.
"""
import asyncio
import os
import re
import markdown

BASE = os.path.dirname(os.path.abspath(__file__))

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

CSS = """
@page {
  size: A4;
  margin: 2.5cm 2cm;
}
@page landscape {
  size: A4 landscape;
  margin: 1.5cm 2cm;
}
* { box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.6;
  color: #1a1a1a;
  max-width: 100%;
}
/* Cover page */
.cover {
  page-break-after: always;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
}
.cover .brand {
  font-size: 48pt;
  font-weight: 800;
  color: #7C3AED;
  margin-bottom: 0.5em;
}
.cover .title {
  font-size: 22pt;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 0.3em;
}
.cover .subtitle {
  font-size: 13pt;
  font-style: italic;
  color: #6b7280;
  margin-bottom: 2em;
}
.cover .meta {
  font-size: 10pt;
  color: #9ca3af;
  line-height: 1.8;
}
.cover .meta hr {
  border: none;
  border-top: 1px solid #d1d5db;
  width: 300px;
  margin: 1em auto;
}
/* TOC */
.toc {
  page-break-after: always;
}
.toc h1 {
  color: #7C3AED;
  border-bottom: 3px solid #7C3AED;
  padding-bottom: 0.3em;
}
.toc ul {
  list-style: none;
  padding-left: 0;
}
.toc > ul > li {
  margin-top: 0.6em;
  font-weight: 700;
  font-size: 11pt;
}
.toc > ul > li > ul > li {
  font-weight: 400;
  font-size: 10pt;
  padding-left: 1.5em;
  margin-top: 0.15em;
}
.toc > ul > li > ul > li > ul > li {
  padding-left: 3em;
  font-size: 9.5pt;
  margin-top: 0.1em;
}
.toc a {
  color: #1a1a1a;
  text-decoration: none;
}
.toc a:hover {
  color: #7C3AED;
}
/* Content headings */
h1 {
  font-size: 20pt;
  color: #7C3AED;
  border-bottom: 3px solid #7C3AED;
  padding-bottom: 0.3em;
  margin-top: 1em;
  page-break-before: always;
}
h1:first-of-type {
  page-break-before: auto;
}
.toc + div h1:first-child {
  page-break-before: auto;
}
h2 {
  font-size: 15pt;
  color: #7C3AED;
  margin-top: 1.2em;
}
h3 {
  font-size: 12pt;
  color: #374151;
  margin-top: 1em;
}
h4 { font-size: 11pt; color: #374151; }
/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 10pt;
}
thead th {
  background: #7C3AED;
  color: white;
  padding: 10px 12px;
  text-align: left;
  font-weight: 600;
}
tbody td {
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: top;
}
tbody tr:nth-child(even) {
  background: #faf5ff;
}
/* Links */
a {
  color: #7C3AED;
  text-decoration: underline;
}
/* Code */
code {
  background: #f3f0ff;
  color: #7C3AED;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 9.5pt;
  font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
}
pre {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 14px;
  overflow-x: auto;
  font-size: 9pt;
  line-height: 1.5;
}
pre code {
  background: none;
  color: #374151;
  padding: 0;
}
/* Blockquote */
blockquote {
  border-left: 4px solid #7C3AED;
  margin: 1em 0;
  padding: 0.5em 1em;
  background: #faf5ff;
  color: #4b5563;
}
/* Lists */
ul, ol { padding-left: 1.5em; }
li { margin-bottom: 0.3em; }
/* Page break helper */
.page-break { page-break-before: always; }
/* Landscape section for diagrams */
.landscape-section {
  page: landscape;
}
.diagram-page {
  page-break-before: always;
}
.diagram-page:first-child {
  page-break-before: auto;
}
/* Mermaid SVG styling */
.mermaid svg {
  max-width: 100%;
  height: auto;
}
/* Bold header rows in non-purple tables (like UC field/value tables) */
strong { font-weight: 700; }
hr {
  border: none;
  border-top: 1.5px solid #7C3AED;
  margin: 2em 0;
}
"""


def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def clean_back_links(content):
    """Remove [<- Voltar ...] links."""
    return re.sub(r'\[<-\s*Voltar[^\]]*\]\([^)]*\)\s*', '', content)


def clean_diagram_wrapper(content):
    """Remove outer triple-backtick wrapper from diagram files."""
    lines = content.strip().split("\n")
    if lines and lines[0].strip() == "```":
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines)


def md_to_html(md_text):
    """Convert markdown to HTML with extensions."""
    return markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc", "attr_list"],
    )


def build_toc_entries():
    """Build TOC structure from the file hierarchy."""
    entries = []

    # INDEX sections
    entries.append(("Casos de Uso — Zoox x Vivo GeoIntelligence", "index", 1))

    # Each UC (grouped by sub-file)
    for uc_dir in UC_IDS:
        uc_id = uc_dir.split("-")[0]
        for sub in SUB_FILES:
            fpath = os.path.join(BASE, uc_dir, f"{uc_id}-{sub}.md")
            if os.path.exists(fpath):
                content = read_file(fpath)
                # Extract first H1
                m = re.search(r'^#\s+(.+)', content, re.MULTILINE)
                if m:
                    title = m.group(1).strip()
                    anchor = f"{uc_id}-{sub}"
                    entries.append((title, anchor, 1))
                # Extract H2s for TOC
                for m2 in re.finditer(r'^##\s+(.+)', content, re.MULTILINE):
                    sub_title = m2.group(1).strip()
                    # Strip {#anchor} attribute syntax from title
                    sub_title = re.sub(r'\s*\{#[^}]+\}\s*$', '', sub_title)
                    sub_anchor = re.sub(r'[^a-zA-Z0-9-]', '', sub_title.lower().replace(' ', '-').replace('—', '-'))
                    entries.append((sub_title, f"{uc_id}-{sub}-{sub_anchor}", 2))

    # Diagrams
    for diag in DIAGRAMS:
        fpath = os.path.join(BASE, "diagrams", f"{diag}.md")
        if os.path.exists(fpath):
            content = clean_diagram_wrapper(read_file(fpath))
            m = re.search(r'^#\s+(.+)', content, re.MULTILINE)
            if m:
                entries.append((m.group(1).strip(), diag, 1))
            # Add "Notas do Diagrama" as sub-entry
            entries.append(("Notas do Diagrama", f"{diag}-notas", 2))

    return entries


def build_toc_html(entries):
    """Build clickable TOC HTML."""
    html = '<div class="toc"><h1>Índice</h1><ul>\n'
    in_sub = False
    for title, anchor, level in entries:
        if level == 1:
            if in_sub:
                html += '</ul></li>\n'
                in_sub = False
            html += f'<li><a href="#{anchor}">{title}</a>\n'
            html += '<ul>\n'
            in_sub = True
        else:
            html += f'<li><a href="#{anchor}">{title}</a></li>\n'
    if in_sub:
        html += '</ul></li>\n'
    html += '</ul></div>\n'
    return html


def build_cover():
    return """
<div class="cover">
  <div class="brand">Zoox × Vivo</div>
  <div class="title">Casos de Uso — GeoIntelligence</div>
  <div class="subtitle">Especificação Funcional · Cockburn Fully-Dressed · IFPUG/NESMA</div>
  <div class="meta">
    <hr>
    Versão 3.0 &middot; 30/03/2026<br>
    12 Casos de Uso &middot; 4 Diagramas de Sequência<br>
    365 Pontos de Função
  </div>
</div>
"""


def build_content_html():
    """Build full HTML body content (INDEX + UCs + Diagrams)."""
    parts = []

    # INDEX content
    index_md = read_file(os.path.join(BASE, "INDEX.md"))
    parts.append(f'<div id="index">{md_to_html(index_md)}</div>')

    # Each UC
    for uc_dir in UC_IDS:
        uc_id = uc_dir.split("-")[0]
        for sub in SUB_FILES:
            fpath = os.path.join(BASE, uc_dir, f"{uc_id}-{sub}.md")
            if os.path.exists(fpath):
                content = read_file(fpath)
                content = clean_back_links(content)
                anchor = f"{uc_id}-{sub}"
                html = md_to_html(content)
                # Add anchor IDs to H2 headings within this section
                parts.append(f'<div id="{anchor}" class="page-break">{html}</div>')

    # Diagrams (landscape)
    parts.append('<div class="landscape-section">')
    for diag in DIAGRAMS:
        fpath = os.path.join(BASE, "diagrams", f"{diag}.md")
        if os.path.exists(fpath):
            content = clean_diagram_wrapper(read_file(fpath))

            # Split content into before-mermaid, mermaid, and after-mermaid
            # Find ```mermaid blocks and convert them to <div class="mermaid">
            def replace_mermaid(m):
                return f'<div class="mermaid">\n{m.group(1)}\n</div>'

            content = re.sub(
                r'```mermaid\s*\n(.*?)```',
                replace_mermaid,
                content,
                flags=re.DOTALL,
            )
            # Now convert remaining markdown (but mermaid divs are already HTML)
            # Split on mermaid divs, convert markdown parts, recombine
            mermaid_parts = re.split(r'(<div class="mermaid">.*?</div>)', content, flags=re.DOTALL)
            html_parts = []
            for p in mermaid_parts:
                if p.startswith('<div class="mermaid">'):
                    html_parts.append(p)
                else:
                    html_parts.append(md_to_html(p))

            html = "\n".join(html_parts)
            # Add notas anchor
            html = html.replace(
                "<h2>Notas do Diagrama</h2>",
                f'<h2 id="{diag}-notas">Notas do Diagrama</h2>'
            )
            parts.append(f'<div id="{diag}" class="diagram-page">{html}</div>')
    parts.append('</div>')

    return "\n".join(parts)


def build_full_html():
    """Assemble the complete HTML document."""
    cover = build_cover()
    toc_entries = build_toc_entries()
    toc = build_toc_html(toc_entries)
    content = build_content_html()

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Casos de Uso — Zoox × Vivo GeoIntelligence</title>
<style>{CSS}</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({{
    startOnLoad: true,
    theme: 'default',
    sequence: {{
      useMaxWidth: true,
      wrap: true,
      showSequenceNumbers: false,
    }},
  }});
</script>
</head>
<body>
{cover}
{toc}
{content}
</body>
</html>"""


async def html_to_pdf(html_path, pdf_path):
    """Use Playwright to convert HTML to PDF."""
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Load the HTML file
        await page.goto(f"file://{html_path}", wait_until="networkidle")

        # Wait for mermaid to render
        await page.wait_for_timeout(3000)

        # Generate PDF
        await page.pdf(
            path=pdf_path,
            format="A4",
            print_background=True,
            margin={"top": "2cm", "bottom": "2cm", "left": "2cm", "right": "2cm"},
        )

        await browser.close()


def main():
    print("Building HTML...")
    html = build_full_html()

    html_path = os.path.join(BASE, "_combined.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    output_pdf = os.path.join(BASE, "casos-de-uso-zoox-vivo.pdf")

    print("Rendering PDF via Chromium...")
    asyncio.run(html_to_pdf(html_path, output_pdf))

    # Clean up
    os.remove(html_path)

    size_kb = os.path.getsize(output_pdf) / 1024
    print(f"PDF generated: {output_pdf} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
