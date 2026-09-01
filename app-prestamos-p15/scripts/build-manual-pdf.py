#!/usr/bin/env python3
"""Build the versioned staff manual PDF from its Markdown source."""

from __future__ import annotations

import html
import json
import os
import re
import unicodedata
from pathlib import Path

import markdown
from markdown.extensions.toc import TocExtension, slugify_unicode
from xhtml2pdf import pisa


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_PATH = PROJECT_ROOT / "docs" / "MANUAL_PERSONAL.md"
STYLESHEET_PATH = PROJECT_ROOT / "docs" / "manual-pdf.css"
PACKAGE_PATH = PROJECT_ROOT / "package.json"
OUTPUT_DIRECTORY = PROJECT_ROOT / "output" / "pdf"
OUTPUT_PATH = OUTPUT_DIRECTORY / "manual-personal-app-prestamos-p15.pdf"


def pdf_anchor(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(character for character in normalized if not unicodedata.combining(character))


def parse_front_matter(source: str) -> tuple[dict[str, str], str]:
    if not source.startswith("---\n"):
        return {}, source

    closing = source.find("\n---\n", 4)
    if closing == -1:
        return {}, source

    metadata: dict[str, str] = {}
    for line in source[4:closing].splitlines():
        key, separator, value = line.partition(":")
        if separator:
            metadata[key.strip()] = value.strip().strip("\"'")
    return metadata, source[closing + 5 :]


def build_html(source: str, stylesheet: str, version: str) -> str:
    metadata, body = parse_front_matter(source)
    renderer = markdown.Markdown(
        extensions=[
            TocExtension(slugify=slugify_unicode),
            "tables",
            "fenced_code",
            "sane_lists",
        ],
        output_format="html5",
    )
    content = renderer.convert(body)
    anchor_ids = set(re.findall(r' id="([^"]+)"', content))
    for anchor_id in anchor_ids:
        safe_id = pdf_anchor(anchor_id)
        content = content.replace(f'id="{anchor_id}"', f'id="{safe_id}"')
        content = content.replace(f'href="#{anchor_id}"', f'href="#{safe_id}"')
    content = re.sub(
        r'<h([1-6]) id="([^"]+)">',
        r'<a name="\2"></a><h\1 id="\2">',
        content,
    )
    title = html.escape(metadata.get("title", "Manual del personal"))
    subtitle = html.escape(metadata.get("subtitle", "App Préstamos P15"))
    language = html.escape(metadata.get("lang", "es"))

    return f"""<!doctype html>
<html lang="{language}">
<head>
  <meta charset="utf-8">
  <title>{title}</title>
  <style>{stylesheet}</style>
</head>
<body>
  <div id="page-header">Manual del personal · App Préstamos P15</div>
  <div id="page-footer">Página <pdf:pagenumber> de <pdf:pagecount></div>
  <table id="title-block-header"><tr><td>
    <p class="title">{title}</p>
    <p class="subtitle">{subtitle}</p>
    <p class="cover-meta">Versión {html.escape(version)} · Manual operativo para el personal</p>
  </td></tr></table>
  <pdf:nextpage />
  <main>{content}</main>
</body>
</html>"""


def main() -> None:
    source = SOURCE_PATH.read_text(encoding="utf-8")
    stylesheet = STYLESHEET_PATH.read_text(encoding="utf-8")
    package = json.loads(PACKAGE_PATH.read_text(encoding="utf-8"))
    version = os.environ.get("MANUAL_VERSION", f"v{package['version']}")
    document = build_html(source, stylesheet, version)

    OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open("wb") as destination:
        result = pisa.CreatePDF(
            document,
            dest=destination,
            encoding="utf-8",
            path=str(PROJECT_ROOT),
        )
    if result.err:
        raise RuntimeError(f"PDF generation failed with {result.err} error(s)")
    print(f"Manual PDF: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
