#!/usr/bin/env python3
"""Gera os datasets TS de referência infantil (edição percentis OMS/SISVAN).

Lê os PDFs em docs/referencias_avaliacao/ e emite, em
lib/nutrition/child/reference-data/percentile/, um arquivo TS por (indicador x sexo),
mais um index.ts. Também grava um SOURCES.md com checksum e contagem de linhas.

Uso (offline, em ambiente de desenvolvimento):
    pip install pdfplumber
    python3 scripts/reference/build_child_growth_tables.py

NÃO roda em produção: os datasets gerados são versionados no repositório.
"""
from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
PDF_DIR = ROOT / "docs" / "referencias_avaliacao"
OUT_DIR = ROOT / "lib" / "nutrition" / "child" / "reference-data" / "percentile"

# (indicador, sexo) -> lista de PDFs em ordem; faixas posteriores sobrescrevem overlap.
SOURCES: dict[tuple[str, str], list[str]] = {
    ("bmi_for_age", "female"): [
        "Tabela_IMC-I_meninas_Perc_0-2anos.pdf",
        "Tabela_IMC-I_meninas_Perc_2-5anos.pdf",
        "Tabela_IMC-I_meninas_Perc_5-19anos.pdf",
    ],
    ("bmi_for_age", "male"): [
        "Tabela_IMC-I_meninos_Perc_0-2anos.pdf",
        "Tabela_IMC-I_meninos_Perc_2-5anos.pdf",
        "Tabela_IMC-I_meninos_Perc_5-19anos.pdf",
    ],
    ("weight_for_age", "female"): [
        "Tabela_P-I_ Meninas_Perc_0-5anos.pdf",
        "Tabela_P-I_meninas_Perc_5-10anos.pdf",
    ],
    ("weight_for_age", "male"): [
        "Tabela_P-I_meninos_Perc_0-5anos.pdf",
        "Tabela_P-I_meninos_Perc_5-10anos.pdf",
    ],
    ("height_for_age", "female"): [
        "Tabela_C-I_meninas_Perc_0-2anos.pdf",
        "Tabela_E-I_meninas_Perc_2-5anos.pdf",
        "Tabela_E-I_Perc_meninas_5-19anos.pdf",
    ],
    ("height_for_age", "male"): [
        "Tabela_C-I_meninos_Perc_0-2anos.pdf",
        "Tabela_E-I_meninos_Perc_2-5anos.pdf",
        "Tabela_E-I_Perc_meninos_5-19anos.pdf",
    ],
}

# Export name por (indicador, sexo).
EXPORT_NAMES = {
    ("bmi_for_age", "female"): "bmiForAgeFemale",
    ("bmi_for_age", "male"): "bmiForAgeMale",
    ("weight_for_age", "female"): "weightForAgeFemale",
    ("weight_for_age", "male"): "weightForAgeMale",
    ("height_for_age", "female"): "heightForAgeFemale",
    ("height_for_age", "male"): "heightForAgeMale",
}

ROW_RE = re.compile(r"^\d+\s*:\s*\d+|^\d+:\d+")


def parse_age_months(tokens: list[str]) -> tuple[int, int]:
    """Devolve (ageMonths, idx_da_proxima_coluna) a partir do prefixo 'Y: M' ou 'Y:M'."""
    t0 = tokens[0]
    if t0.endswith(":"):
        year = int(t0[:-1])
        month_in_year = int(re.sub(r"\D", "", tokens[1]))
        return year * 12 + month_in_year, 2
    # formato "Y:M" colado
    year_str, month_str = t0.split(":")
    year = int(year_str)
    month_in_year = int(re.sub(r"\D", "", month_str))
    return year * 12 + month_in_year, 1


def parse_pdf(path: Path) -> dict[int, list[float]]:
    """Extrai {ageMonths: [11 percentis]} de um PDF (edição percentis).

    Estratégia robusta: idade = year*12 + month do prefixo; percentis = os 11
    últimos números da linha (P1..P99), independente da coluna SD existir ou não.
    """
    out: dict[int, list[float]] = {}
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for raw in text.splitlines():
                line = raw.strip()
                if not ROW_RE.match(line):
                    continue
                tokens = line.split()
                try:
                    age_months, _ = parse_age_months(tokens)
                except (ValueError, IndexError):
                    continue
                # Coleta todos os floats da linha; os 11 últimos são P1..P99.
                nums: list[float] = []
                for tok in tokens:
                    cleaned = re.sub(r"[^0-9.\-]", "", tok)
                    if cleaned in ("", "-", ".", "-."):
                        continue
                    try:
                        nums.append(float(cleaned))
                    except ValueError:
                        continue
                if len(nums) < 11:
                    continue
                percentiles = nums[-11:]
                out[age_months] = percentiles
    return out


def ts_table(name: str, table: dict[int, list[float]]) -> str:
    lines = [
        'import type { PercentileTable } from "../../types";',
        "",
        "/** Gerado por scripts/reference/build_child_growth_tables.py — não editar à mão. */",
        f"export const {name}: PercentileTable = {{",
    ]
    for age in sorted(table):
        vals = ", ".join(_fmt(v) for v in table[age])
        lines.append(f"  {age}: [{vals}],")
    lines.append("};")
    lines.append("")
    return "\n".join(lines)


def _fmt(v: float) -> str:
    return str(int(v)) if v == int(v) else repr(round(v, 4))


def kebab(indicator: str) -> str:
    return indicator.replace("_", "-")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sources_md = ["# Datasets de referência infantil — edição percentis", ""]
    sources_md.append("Gerado por `scripts/reference/build_child_growth_tables.py`.")
    sources_md.append("")

    index_lines: list[str] = [
        '/** Gerado por scripts/reference/build_child_growth_tables.py — não editar à mão. */',
    ]
    index_map: list[str] = []

    for (indicator, sex), files in SOURCES.items():
        merged: dict[int, list[float]] = {}
        file_notes: list[str] = []
        for fname in files:
            path = PDF_DIR / fname
            data = parse_pdf(path)
            merged.update(data)  # faixa posterior sobrescreve overlap
            digest = hashlib.sha256(path.read_bytes()).hexdigest()[:12]
            file_notes.append(f"  - `{fname}` — {len(data)} linhas — sha256:{digest}")

        name = EXPORT_NAMES[(indicator, sex)]
        out_file = OUT_DIR / f"{kebab(indicator)}.{sex}.ts"
        out_file.write_text(ts_table(name, merged), encoding="utf-8")

        index_lines.append(
            f'import {{ {name} }} from "./{kebab(indicator)}.{sex}";'
        )
        index_map.append(f'  "{indicator}:{sex}": {name},')

        sources_md.append(f"## {indicator} · {sex} ({len(merged)} idades em meses)")
        sources_md.extend(file_notes)
        sources_md.append("")

    index_lines.append('import type { PercentileTable } from "../../types";')
    index_lines.append("")
    index_lines.append(
        "export const PERCENTILE_TABLES: Record<string, PercentileTable> = {"
    )
    index_lines.extend(index_map)
    index_lines.append("};")
    index_lines.append("")
    (OUT_DIR / "index.ts").write_text("\n".join(index_lines), encoding="utf-8")

    (OUT_DIR.parent / "SOURCES.md").write_text("\n".join(sources_md), encoding="utf-8")
    print(f"OK — datasets gerados em {OUT_DIR}")


if __name__ == "__main__":
    main()
