#!/usr/bin/env python3
"""
Scraper de paletas de colores Alba (https://www.alba.com.ar/es/paletas-de-colores/).

Fuente principal: API interna POST /bin/api/colorPopUp
Enriquecimiento: JSON embebido en <script class="js-carousel-data"> (href + id de imagen).

Uso:
  python scripts/scrape_alba_colores.py
  python scripts/scrape_alba_colores.py --out data/alba_colores.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import ssl
import sys
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path


def _ssl_context() -> ssl.SSLContext:
    """Contexto TLS. En algunos entornos locales la CA del sitio falla en Python 3.14."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


SSL_CONTEXT = _ssl_context()

BASE_URL = "https://www.alba.com.ar"
PAGE_PATH = "/es/paletas-de-colores/"
PAGE_AEM = "/content/akzonobel-flourish/alba/ar/es/paletas-de-colores"
COLOR_POPUP_API = f"{BASE_URL}/bin/api/colorPopUp?page={PAGE_AEM}"
PAGE_URL = f"{BASE_URL}{PAGE_PATH}"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Nombre - 14RR 12/349  |  Nombre * - 80RR 12/430
LABEL_RE = re.compile(
    r"^(?P<nombre>.+?)\s*[-–]\s*(?P<codigo>\d{2}[A-Z]{2}\s+\d{2}/\d{3})\s*$",
    re.UNICODE,
)

WALL_JSON_MARKER = '[{"image":{"src":"/content/dam/akzonobel-common/colorWall'
CSV_COLUMNS = ["codigo", "nombre", "url", "imagen", "hex", "rgb", "familia", "ambiente"]


def http_request(
    url: str,
    *,
    method: str = "GET",
    body: bytes | None = None,
    content_type: str | None = None,
    timeout: int = 90,
) -> bytes:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json, text/html, */*",
        "Accept-Language": "es-AR,es;q=0.9",
    }
    if content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=SSL_CONTEXT) as resp:
            return resp.read()
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} en {url}") from exc


def extract_balanced_json_array(html: str, start: int) -> str:
    depth = 0
    in_str = False
    escape = False
    for j, ch in enumerate(html[start:], start):
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return html[start : j + 1]
    raise ValueError("JSON de color wall incompleto")


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = text.replace("*", "")
    text = text.replace("/", "-")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def parse_label(label: str) -> tuple[str, str]:
    label = (label or "").strip()
    match = LABEL_RE.match(label)
    if match:
        return match.group("codigo").strip(), match.group("nombre").strip()
    return "", label


def hex_to_rgb(hex_color: str) -> str:
    value = (hex_color or "").strip().lstrip("#")
    if len(value) == 3:
        value = "".join(ch * 2 for ch in value)
    if len(value) != 6 or any(ch not in "0123456789abcdefABCDEF" for ch in value):
        return ""
    r = int(value[0:2], 16)
    g = int(value[2:4], 16)
    b = int(value[4:6], 16)
    return f"{r},{g},{b}"


def absolute_url(path: str) -> str:
    if not path or path == "#":
        return ""
    if path.startswith("http://") or path.startswith("https://"):
        return path
    if not path.startswith("/"):
        path = "/" + path
    return BASE_URL + path


def build_detail_url(nombre: str, codigo: str, ccid: str) -> str:
    parts = [slugify(nombre)]
    if codigo:
        parts.append(slugify(codigo))
    if ccid:
        parts.append(ccid)
    slug = "-".join(p for p in parts if p)
    return f"{BASE_URL}{PAGE_PATH}{slug}"


def sample_image_url(color_id: str) -> str:
    """Imagen inspiracional (ambiente Livingroom) asociada al id interno AkzoNobel."""
    if not color_id:
        return ""
    return (
        "https://msp.images.akzonobel.com/glb/dh/inspirational-images/"
        f"Livingroom-{color_id}.png"
    )


def fetch_api_colors() -> list[dict]:
    raw = http_request(
        COLOR_POPUP_API,
        method="POST",
        body=b"{}",
        content_type="application/json",
    )
    payload = json.loads(raw.decode("utf-8"))
    hues = (payload.get("data") or {}).get("colorsHues") or {}
    rows: list[dict] = []
    for familia, group in hues.items():
        for card in group.get("colorCardDetailsList") or []:
            label = (card.get("label") or "").strip()
            codigo, nombre = parse_label(label)
            ccid = str(card.get("ccid") or "").strip()
            hex_value = (card.get("hex") or "").strip()
            if hex_value and not hex_value.startswith("#"):
                hex_value = f"#{hex_value}"
            rows.append(
                {
                    "ccid": ccid,
                    "codigo": codigo,
                    "nombre": nombre,
                    "hex": hex_value.upper() if hex_value else "",
                    "familia": familia,
                    "label": label,
                }
            )
    return rows


def fetch_wall_enrichment() -> dict[str, dict]:
    """Mapa ccid -> {url, id} desde el JSON SSR de la pared de colores."""
    html = http_request(PAGE_URL).decode("utf-8", "replace")
    start = html.find(WALL_JSON_MARKER)
    if start < 0:
        print("Aviso: no se encontró JSON embebido del color wall; sin URLs/ids extra.", file=sys.stderr)
        return {}

    blob = extract_balanced_json_array(html, start)
    wall = json.loads(blob)
    by_ccid: dict[str, dict] = {}
    for hue in wall:
        for item in hue.get("colors") or []:
            color = item.get("color") or {}
            ccid = str(color.get("ccid") or "").strip()
            if not ccid:
                continue
            by_ccid[ccid] = {
                "url": absolute_url(color.get("href") or ""),
                "id": str(color.get("id") or "").strip(),
                "hex": (color.get("hex") or "").strip(),
            }
    return by_ccid


def merge_rows(api_rows: list[dict], wall_by_ccid: dict[str, dict]) -> list[dict]:
    merged: list[dict] = []
    seen: set[tuple[str, str, str]] = set()

    for row in api_rows:
        ccid = row["ccid"]
        wall = wall_by_ccid.get(ccid, {})
        url = wall.get("url") or build_detail_url(row["nombre"], row["codigo"], ccid)
        hex_value = (row["hex"] or wall.get("hex") or "").upper()
        if hex_value and not hex_value.startswith("#"):
            hex_value = f"#{hex_value}"

        key = (row["codigo"], row["nombre"].casefold(), hex_value)
        if key in seen:
            continue
        # Preferir filas con código Alba; si no hay código, aún se exportan.
        seen.add(key)

        merged.append(
            {
                "codigo": row["codigo"],
                "nombre": row["nombre"],
                "url": url,
                "imagen": sample_image_url(wall.get("id", "")),
                "hex": hex_value,
                "rgb": hex_to_rgb(hex_value),
                "familia": row["familia"],
                # No hay campo estructurado "ambiente" en API ni en la pared.
                "ambiente": "",
            }
        )

    # Orden estable: con código primero, luego por familia/nombre
    merged.sort(
        key=lambda r: (
            0 if r["codigo"] else 1,
            r["familia"].casefold(),
            r["nombre"].casefold(),
            r["codigo"],
        )
    )
    return merged


def write_csv(rows: list[dict], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8-sig", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=CSV_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(description="Scraper de colores Alba")
    parser.add_argument(
        "--out",
        default="scripts/alba_colores.csv",
        help="Ruta del CSV de salida (default: scripts/alba_colores.csv)",
    )
    args = parser.parse_args()
    out_path = Path(args.out)

    print("1) Consultando API colorPopUp...")
    api_rows = fetch_api_colors()
    print(f"   -> {len(api_rows)} colores desde API")

    print("2) Enriqueciendo con JSON embebido del color wall...")
    wall_by_ccid = fetch_wall_enrichment()
    print(f"   -> {len(wall_by_ccid)} colores con href/id en pared")

    print("3) Unificando y exportando CSV...")
    rows = merge_rows(api_rows, wall_by_ccid)
    write_csv(rows, out_path)

    with_code = sum(1 for r in rows if r["codigo"])
    with_image = sum(1 for r in rows if r["imagen"])
    print(f"Listo: {len(rows)} filas -> {out_path.resolve()}")
    print(f"  con codigo Alba: {with_code}")
    print(f"  con imagen:      {with_image}")
    print(f"  familias:        {sorted({r['familia'] for r in rows})}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
