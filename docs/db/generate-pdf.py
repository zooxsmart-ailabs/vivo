#!/usr/bin/env python3
"""Generate styled, indexed PDF from database documentation.

Uses Markdown → HTML (with custom CSS) → PDF (via Playwright/Chromium).
Mermaid ER diagrams are rendered client-side by the mermaid.js library.
"""
import asyncio
import os
import re
import markdown

BASE = os.path.dirname(os.path.abspath(__file__))

# Ordered list of docs to include
DOCS = [
    ("DB-INDEX.md", None),
    ("conceptual/ER-conceptual.md", None),
    ("logical/schema-logical.md", None),
    ("physical/data-dictionary.md", None),
    ("physical/DDL-geointelligence.sql", "sql"),
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
  font-size: 9pt;
}
thead th {
  background: #7C3AED;
  color: white;
  padding: 8px 10px;
  text-align: left;
  font-weight: 600;
}
tbody td {
  padding: 6px 10px;
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
  font-size: 9pt;
  font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
}
pre {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 14px;
  overflow-x: auto;
  font-size: 8pt;
  line-height: 1.4;
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
/* Landscape for ER diagram */
.landscape-section {
  page: landscape;
}
.diagram-page {
  page-break-before: always;
}
/* Mermaid SVG styling */
.mermaid svg {
  max-width: 100%;
  height: auto;
}
strong { font-weight: 700; }
hr {
  border: none;
  border-top: 1.5px solid #7C3AED;
  margin: 2em 0;
}
/* SQL syntax coloring (basic) */
.sql-keyword { color: #7C3AED; font-weight: bold; }
.sql-comment { color: #6b7280; font-style: italic; }
.sql-string { color: #059669; }
.sql-type { color: #2563eb; }
"""


def read_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def md_to_html(md_text):
    return markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc", "attr_list"],
    )


def process_mermaid(content):
    """Replace ```mermaid blocks with <div class='mermaid'>."""
    def replace_mermaid(m):
        return f'<div class="mermaid">\n{m.group(1)}\n</div>'

    content = re.sub(
        r'```mermaid\s*\n(.*?)```',
        replace_mermaid,
        content,
        flags=re.DOTALL,
    )
    # Split on mermaid divs, convert markdown parts, recombine
    mermaid_parts = re.split(r'(<div class="mermaid">.*?</div>)', content, flags=re.DOTALL)
    html_parts = []
    for p in mermaid_parts:
        if p.startswith('<div class="mermaid">'):
            html_parts.append(p)
        else:
            html_parts.append(md_to_html(p))
    return "\n".join(html_parts)


def sql_to_html(sql_text):
    """Convert SQL to basic syntax-highlighted HTML."""
    import html as html_mod
    escaped = html_mod.escape(sql_text)

    # Highlight SQL comments
    escaped = re.sub(
        r'(--[^\n]*)',
        r'<span class="sql-comment">\1</span>',
        escaped,
    )

    # Highlight SQL keywords
    keywords = (
        r'\b(CREATE|TABLE|VIEW|INDEX|TYPE|AS|ENUM|SELECT|FROM|WHERE|'
        r'INSERT|INTO|VALUES|UPDATE|SET|DELETE|ALTER|DROP|ADD|'
        r'PRIMARY\s+KEY|FOREIGN\s+KEY|REFERENCES|UNIQUE|NOT\s+NULL|NULL|DEFAULT|'
        r'CHECK|CONSTRAINT|ON|CASCADE|IF\s+NOT\s+EXISTS|IF\s+EXISTS|'
        r'JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|UNION|ALL|'
        r'AND|OR|IN|BETWEEN|LIKE|IS|CASE|WHEN|THEN|ELSE|END|'
        r'ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|OFFSET|DISTINCT|'
        r'WITH|RECURSIVE|MATERIALIZED|REFRESH|'
        r'BEGIN|COMMIT|ROLLBACK|RETURNS|RETURN|LANGUAGE|'
        r'FUNCTION|TRIGGER|EXECUTE|PROCEDURE|'
        r'GRANT|REVOKE|SCHEMA|EXTENSION|'
        r'HYPERTABLE|CONTINUOUS\s+AGGREGATE|COMPRESSION|RETENTION)\b'
    )
    escaped = re.sub(
        keywords,
        r'<span class="sql-keyword">\1</span>',
        escaped,
        flags=re.IGNORECASE,
    )

    # Highlight types
    types = (
        r'\b(SERIAL|BIGSERIAL|INTEGER|INT|BIGINT|SMALLINT|'
        r'VARCHAR|TEXT|CHAR|BOOLEAN|BOOL|'
        r'NUMERIC|DECIMAL|REAL|DOUBLE\s+PRECISION|FLOAT|'
        r'TIMESTAMP|TIMESTAMPTZ|DATE|TIME|INTERVAL|'
        r'JSON|JSONB|UUID|GEOMETRY|POINT|POLYGON)\b'
    )
    escaped = re.sub(
        types,
        r'<span class="sql-type">\1</span>',
        escaped,
        flags=re.IGNORECASE,
    )

    # Highlight strings
    escaped = re.sub(
        r"('(?:[^'\\]|\\.)*')",
        r'<span class="sql-string">\1</span>',
        escaped,
    )

    return f'<pre><code>{escaped}</code></pre>'


def build_toc_entries():
    """Build TOC from the documentation files."""
    entries = []

    for doc_path, doc_type in DOCS:
        fpath = os.path.join(BASE, doc_path)
        if not os.path.exists(fpath):
            continue

        if doc_type == "sql":
            entries.append(("DDL — Script de Criação", "ddl-script", 1))
            continue

        content = read_file(fpath)

        # Extract H1
        m = re.search(r'^#\s+(.+)', content, re.MULTILINE)
        if m:
            title = re.sub(r'\s*\{#[^}]+\}\s*$', '', m.group(1).strip())
            anchor = re.sub(r'[^a-zA-Z0-9-]', '', doc_path.replace('/', '-').replace('.md', ''))
            entries.append((title, anchor, 1))

        # Extract H2s
        for m2 in re.finditer(r'^##\s+(.+)', content, re.MULTILINE):
            sub_title = re.sub(r'\s*\{#[^}]+\}\s*$', '', m2.group(1).strip())
            sub_anchor = re.sub(r'[^a-zA-Z0-9-]', '',
                                sub_title.lower().replace(' ', '-').replace('—', '-'))
            entries.append((sub_title, f"{anchor}-{sub_anchor}", 2))

    return entries


def build_toc_html(entries):
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
  <div class="title">Modelo de Dados — GeoIntelligence</div>
  <div class="subtitle">PostgreSQL + TimescaleDB + PostGIS · Dicionário de Dados</div>
  <div class="meta">
    <hr>
    Versão 3.0 &middot; 01/04/2026<br>
    Conceitual &middot; Lógico &middot; Físico &middot; DDL<br>
    15 Entidades &middot; 3 Views &middot; 8 Enums
  </div>
</div>
"""


def build_content_html():
    parts = []

    for doc_path, doc_type in DOCS:
        fpath = os.path.join(BASE, doc_path)
        if not os.path.exists(fpath):
            continue

        anchor = re.sub(r'[^a-zA-Z0-9-]', '', doc_path.replace('/', '-').replace('.md', ''))

        if doc_type == "sql":
            sql_content = read_file(fpath)
            html = f'<h1>DDL — Script de Criação</h1>\n{sql_to_html(sql_content)}'
            parts.append(f'<div id="ddl-script" class="page-break">{html}</div>')
            continue

        content = read_file(fpath)

        # Check if content has mermaid blocks
        has_mermaid = '```mermaid' in content or '```erDiagram' in content

        if has_mermaid:
            html = process_mermaid(content)
            # ER diagram should be in landscape
            if 'erDiagram' in content or 'ER-conceptual' in doc_path:
                parts.append(f'<div id="{anchor}" class="landscape-section diagram-page">{html}</div>')
            else:
                parts.append(f'<div id="{anchor}" class="page-break">{html}</div>')
        else:
            html = md_to_html(content)
            parts.append(f'<div id="{anchor}" class="page-break">{html}</div>')

    return "\n".join(parts)


def build_full_html():
    cover = build_cover()
    toc_entries = build_toc_entries()
    toc = build_toc_html(toc_entries)
    content = build_content_html()

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Modelo de Dados — Zoox × Vivo GeoIntelligence</title>
<style>{CSS}</style>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({{
    startOnLoad: true,
    theme: 'default',
    er: {{
      useMaxWidth: true,
      layoutDirection: 'TB',
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
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        await page.goto(f"file://{html_path}", wait_until="networkidle")
        # Wait for mermaid to render
        await page.wait_for_timeout(5000)

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

    output_pdf = os.path.join(BASE, "modelo-de-dados-zoox-vivo.pdf")

    print("Rendering PDF via Chromium...")
    asyncio.run(html_to_pdf(html_path, output_pdf))

    os.remove(html_path)

    size_kb = os.path.getsize(output_pdf) / 1024
    print(f"PDF generated: {output_pdf} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
