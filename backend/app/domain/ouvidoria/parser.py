from __future__ import annotations

import re
import tempfile
import unicodedata
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import pandas as pd


WORKSHEET_NAME = "Tablib Dataset"
CALL_CENTER_SUBASSUNTO = "Dificuldade de Atendimento pelo Call Center da Compesa"
DESCONSIDERAR_SUBASSUNTO = (
    "INFORMAÇÕES TELEFONE/ENDEREÇO DA PRESTADORA DE SERVIÇO DE SANEAMENTO"
)

MONTHS_PT = {
    1: "Janeiro",
    2: "Fevereiro",
    3: "Março",
    4: "Abril",
    5: "Maio",
    6: "Junho",
    7: "Julho",
    8: "Agosto",
    9: "Setembro",
    10: "Outubro",
    11: "Novembro",
    12: "Dezembro",
}

MONTH_NAME_TO_NUMBER = {
    "janeiro": 1,
    "fevereiro": 2,
    "marco": 3,
    "março": 3,
    "abril": 4,
    "maio": 5,
    "junho": 6,
    "julho": 7,
    "agosto": 8,
    "setembro": 9,
    "outubro": 10,
    "novembro": 11,
    "dezembro": 12,
}

ALIASES = {
    "id_protocolo": [
        "protocolo",
        "numero_protocolo",
        "n_protocolo",
        "numero do protocolo",
        "número do protocolo",
    ],
    "data_criacao": [
        "data_criacao",
        "data criacao",
        "data criação",
        "data de criacao",
        "data de criação",
        "criado em",
        "data abertura",
        "data de abertura",
    ],
    "data_prorrogacao": [
        "data_prorrogacao",
        "data prorrogacao",
        "data prorrogação",
        "data de prorrogacao",
        "data de prorrogação",
        "prorrogado em",
    ],
    "data_conclusao": [
        "data_conclusao",
        "data conclusao",
        "data conclusão",
        "data de conclusao",
        "data de conclusão",
        "concluido em",
        "concluído em",
    ],
    "assunto": ["assunto"],
    "subassunto": ["subassunto", "sub assunto"],
    "orgao_origem": [
        "orgao_origem",
        "orgao origem",
        "órgão origem",
        "orgão origem",
        "orgao de origem",
        "órgão de origem",
    ],
    "origem_atendimento": [
        "origem_atendimento",
        "origem atendimento",
        "origem do atendimento",
        "canal",
    ],
    "modalidade_atendimento": [
        "modalidade_atendimento",
        "modalidade atendimento",
        "modalidade",
    ],
    "tipo_atendimento": ["tipo_atendimento", "tipo atendimento", "tipo de atendimento"],
    "situacao": ["situacao", "situação", "status"],
    "palavras_chave": ["palavras_chave", "palavras chave", "palavra-chave"],
    "setores": ["setores", "setor"],
}


@dataclass(frozen=True)
class ParsedWorksheet:
    dataframe: pd.DataFrame
    suggested_name: str
    worksheet_name: str
    competencia_ano_mes: str | None


def normalize_key(value: str) -> str:
    text_value = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode()
    text_value = text_value.lower().strip()
    return re.sub(r"[^a-z0-9]+", "_", text_value).strip("_")


def normalize_compare(value: str | None) -> str:
    if not value:
        return ""
    text_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    text_value = re.sub(r"\s+", " ", text_value).strip().upper()
    return text_value


def clean_text(value: object) -> str | None:
    if pd.isna(value):
        return None
    text_value = re.sub(r"\s+", " ", str(value)).strip()
    return text_value or None


def parse_date(value: object) -> date | None:
    if pd.isna(value):
        return None
    parsed = pd.to_datetime(value, dayfirst=True, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date()


def sk_from_date(value: date) -> int:
    return int(value.strftime("%Y%m%d"))


def canonicalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    normalized_to_original = {normalize_key(col): col for col in df.columns}
    rename: dict[str, str] = {}
    for target, names in ALIASES.items():
        for name in names:
            key = normalize_key(name)
            if key in normalized_to_original:
                rename[normalized_to_original[key]] = target
                break
    return df.rename(columns=rename)


def prepare_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    required = ["id_protocolo", "data_criacao", "assunto", "subassunto"]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Colunas obrigatorias ausentes: {', '.join(missing)}")

    for col in [
        "id_protocolo",
        "assunto",
        "subassunto",
        "orgao_origem",
        "origem_atendimento",
        "modalidade_atendimento",
        "tipo_atendimento",
        "situacao",
        "palavras_chave",
        "setores",
    ]:
        if col not in df.columns:
            df[col] = None
        df[col] = df[col].map(clean_text)

    for col in ["data_criacao", "data_prorrogacao", "data_conclusao"]:
        if col not in df.columns:
            df[col] = None
        df[col] = df[col].map(parse_date)

    df = df.dropna(subset=["id_protocolo", "data_criacao"]).copy()
    for col in [
        "assunto",
        "subassunto",
        "orgao_origem",
        "origem_atendimento",
        "modalidade_atendimento",
        "tipo_atendimento",
        "situacao",
    ]:
        df[col] = df[col].fillna("Não informado")
    df["dias_para_conclusao"] = df.apply(
        lambda row: (row["data_conclusao"] - row["data_criacao"]).days
        if row["data_conclusao"] and row["data_criacao"]
        else None,
        axis=1,
    )
    return df.drop_duplicates(subset=["id_protocolo"], keep="last")


def infer_suggested_name(filename: str) -> str:
    stem = Path(filename).stem
    cleaned = stem.replace("_", " ").replace("-", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or stem


def infer_competencia_from_filename(filename: str) -> str | None:
    normalized = normalize_compare(Path(filename).stem).lower()
    month = None
    for month_name, month_number in MONTH_NAME_TO_NUMBER.items():
        if normalize_compare(month_name).lower() in normalized:
            month = month_number
            break
    if not month:
        return None

    year_match = re.search(r"(20\d{2})", normalized)
    if not year_match:
        return None
    return f"{int(year_match.group(1)):04d}-{month:02d}"


def infer_competencia_from_data(df: pd.DataFrame) -> str | None:
    if df.empty or "data_criacao" not in df.columns:
        return None
    dates = [value for value in df["data_criacao"].tolist() if value]
    if not dates:
        return None
    buckets: dict[str, int] = {}
    for value in dates:
        key = value.strftime("%Y-%m")
        buckets[key] = buckets.get(key, 0) + 1
    return max(buckets.items(), key=lambda item: item[1])[0]


def read_excel_bytes(contents: bytes, filename: str) -> ParsedWorksheet:
    suffix = Path(filename).suffix or ".xlsx"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=True) as tmp:
        tmp.write(contents)
        tmp.flush()
        workbook = pd.ExcelFile(tmp.name)
        worksheet_name = WORKSHEET_NAME if WORKSHEET_NAME in workbook.sheet_names else workbook.sheet_names[0]
        raw_df = pd.read_excel(workbook, sheet_name=worksheet_name, dtype=object)

    df = prepare_dataframe(canonicalize_columns(raw_df))
    return ParsedWorksheet(
        dataframe=df,
        suggested_name=infer_suggested_name(filename),
        worksheet_name=worksheet_name,
        competencia_ano_mes=infer_competencia_from_filename(filename) or infer_competencia_from_data(df),
    )


def is_call_center_subassunto(subassunto: str | None) -> bool:
    return normalize_compare(subassunto) == normalize_compare(CALL_CENTER_SUBASSUNTO)


def is_desconsiderar_subassunto(subassunto: str | None) -> bool:
    return normalize_compare(subassunto) == normalize_compare(DESCONSIDERAR_SUBASSUNTO)
