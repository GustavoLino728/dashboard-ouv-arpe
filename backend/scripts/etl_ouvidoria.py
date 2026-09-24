from __future__ import annotations

import argparse
import os
import re
import unicodedata
from dataclasses import dataclass
from datetime import date
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text


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


@dataclass(frozen=True)
class ColumnMap:
    protocolo: str = "id_protocolo"
    data_criacao: str = "data_criacao"
    data_prorrogacao: str = "data_prorrogacao"
    data_conclusao: str = "data_conclusao"
    assunto: str = "assunto"
    subassunto: str = "subassunto"
    orgao_origem: str = "orgao_origem"
    origem_atendimento: str = "origem_atendimento"
    modalidade_atendimento: str = "modalidade_atendimento"
    tipo_atendimento: str = "tipo_atendimento"
    situacao: str = "situacao"
    palavras_chave: str = "palavras_chave"
    setores: str = "setores"


ALIASES = {
    "id_protocolo": ["protocolo", "numero_protocolo", "n_protocolo", "número do protocolo", "numero do protocolo"],
    "data_criacao": ["data_criacao", "data criação", "data de criação", "criado em", "data abertura", "data de abertura"],
    "data_prorrogacao": ["data_prorrogacao", "data prorrogação", "data de prorrogação", "prorrogado em"],
    "data_conclusao": ["data_conclusao", "data conclusão", "data de conclusão", "concluído em", "concluido em"],
    "assunto": ["assunto"],
    "subassunto": ["subassunto", "sub assunto"],
    "orgao_origem": ["orgao_origem", "órgão origem", "orgão origem", "orgao origem", "órgão de origem"],
    "origem_atendimento": ["origem_atendimento", "origem atendimento", "origem do atendimento", "canal"],
    "modalidade_atendimento": ["modalidade_atendimento", "modalidade atendimento", "modalidade"],
    "tipo_atendimento": ["tipo_atendimento", "tipo atendimento", "tipo de atendimento"],
    "situacao": ["situacao", "situação", "status"],
    "palavras_chave": ["palavras_chave", "palavras chave", "palavra-chave"],
    "setores": ["setores", "setor"],
}


def normalize_key(value: str) -> str:
    text_value = unicodedata.normalize("NFKD", str(value)).encode("ascii", "ignore").decode()
    text_value = text_value.lower().strip()
    return re.sub(r"[^a-z0-9]+", "_", text_value).strip("_")


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


def load_excel_files(input_dir: Path) -> pd.DataFrame:
    files = sorted(
        [*input_dir.glob("*.xlsx"), *input_dir.glob("*.xls"), *input_dir.glob("*.xlsm")]
    )
    if not files:
        raise FileNotFoundError(f"Nenhuma planilha Excel encontrada em {input_dir}")

    frames = []
    for file_path in files:
        frame = pd.read_excel(file_path, dtype=object)
        frame = canonicalize_columns(frame)
        frame["arquivo_origem"] = file_path.name
        frames.append(frame)
    return pd.concat(frames, ignore_index=True)


def prepare_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    required = ["id_protocolo", "data_criacao", "assunto", "subassunto"]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Colunas obrigatórias ausentes: {', '.join(missing)}")

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
    df["assunto"] = df["assunto"].fillna("Não informado")
    df["subassunto"] = df["subassunto"].fillna("Não informado")
    df["dias_para_conclusao"] = df.apply(
        lambda row: (row["data_conclusao"] - row["data_criacao"]).days
        if row["data_conclusao"] and row["data_criacao"]
        else None,
        axis=1,
    )
    return df.drop_duplicates(subset=["id_protocolo"], keep="last")


def upsert_dim_data(conn, dates: set[date]) -> None:
    for value in sorted(dates):
        conn.execute(
            text(
                """
                INSERT INTO dim_data (sk_data, data_completa, ano, mes, nome_mes, ano_mes)
                VALUES (:sk_data, :data_completa, :ano, :mes, :nome_mes, :ano_mes)
                ON CONFLICT (sk_data) DO UPDATE SET
                    data_completa = EXCLUDED.data_completa,
                    ano = EXCLUDED.ano,
                    mes = EXCLUDED.mes,
                    nome_mes = EXCLUDED.nome_mes,
                    ano_mes = EXCLUDED.ano_mes
                """
            ),
            {
                "sk_data": sk_from_date(value),
                "data_completa": value,
                "ano": value.year,
                "mes": value.month,
                "nome_mes": MONTHS_PT[value.month],
                "ano_mes": value.strftime("%Y-%m"),
            },
        )


def upsert_dimensions(conn, df: pd.DataFrame) -> tuple[dict[tuple[str, str], int], dict[tuple[str | None, str | None], int], dict[tuple[str | None, str | None, str | None], int]]:
    for assunto, subassunto in df[["assunto", "subassunto"]].drop_duplicates().itertuples(index=False):
        conn.execute(
            text(
                """
                INSERT INTO dim_assunto (
                    assunto, subassunto, flag_dificuldade_call_center, flag_desconsiderar_regra_arpe
                )
                VALUES (:assunto, :subassunto, :flag_call_center, :flag_desconsiderar)
                ON CONFLICT (assunto, subassunto) DO UPDATE SET
                    flag_dificuldade_call_center = EXCLUDED.flag_dificuldade_call_center,
                    flag_desconsiderar_regra_arpe = EXCLUDED.flag_desconsiderar_regra_arpe
                """
            ),
            {
                "assunto": assunto,
                "subassunto": subassunto,
                "flag_call_center": subassunto == CALL_CENTER_SUBASSUNTO,
                "flag_desconsiderar": subassunto == DESCONSIDERAR_SUBASSUNTO,
            },
        )

    for orgao, origem in df[["orgao_origem", "origem_atendimento"]].drop_duplicates().itertuples(index=False):
        conn.execute(
            text(
                """
                INSERT INTO dim_origem (orgao_origem, origem_atendimento)
                VALUES (:orgao, :origem)
                ON CONFLICT (orgao_origem, origem_atendimento) DO NOTHING
                """
            ),
            {"orgao": orgao, "origem": origem},
        )

    status_cols = ["modalidade_atendimento", "tipo_atendimento", "situacao"]
    for modalidade, tipo, situacao in df[status_cols].drop_duplicates().itertuples(index=False):
        conn.execute(
            text(
                """
                INSERT INTO dim_status (modalidade_atendimento, tipo_atendimento, situacao)
                VALUES (:modalidade, :tipo, :situacao)
                ON CONFLICT (modalidade_atendimento, tipo_atendimento, situacao) DO NOTHING
                """
            ),
            {"modalidade": modalidade, "tipo": tipo, "situacao": situacao},
        )

    assunto_map = {
        (row.assunto, row.subassunto): row.sk_assunto
        for row in conn.execute(text("SELECT sk_assunto, assunto, subassunto FROM dim_assunto")).fetchall()
    }
    origem_map = {
        (row.orgao_origem, row.origem_atendimento): row.sk_origem
        for row in conn.execute(text("SELECT sk_origem, orgao_origem, origem_atendimento FROM dim_origem")).fetchall()
    }
    status_map = {
        (row.modalidade_atendimento, row.tipo_atendimento, row.situacao): row.sk_status
        for row in conn.execute(text("SELECT sk_status, modalidade_atendimento, tipo_atendimento, situacao FROM dim_status")).fetchall()
    }
    return assunto_map, origem_map, status_map


def upsert_facts(conn, df: pd.DataFrame, assunto_map, origem_map, status_map) -> int:
    count = 0
    for row in df.itertuples(index=False):
        conn.execute(
            text(
                """
                INSERT INTO fato_manifestacoes (
                    id_protocolo, sk_data_criacao, sk_data_prorrogacao, sk_data_conclusao,
                    sk_assunto, sk_origem, sk_status, palavras_chave, setores,
                    dias_para_conclusao, qtd_manifestacoes
                )
                VALUES (
                    :id_protocolo, :sk_data_criacao, :sk_data_prorrogacao, :sk_data_conclusao,
                    :sk_assunto, :sk_origem, :sk_status, :palavras_chave, :setores,
                    :dias_para_conclusao, 1
                )
                ON CONFLICT (id_protocolo) DO UPDATE SET
                    sk_data_criacao = EXCLUDED.sk_data_criacao,
                    sk_data_prorrogacao = EXCLUDED.sk_data_prorrogacao,
                    sk_data_conclusao = EXCLUDED.sk_data_conclusao,
                    sk_assunto = EXCLUDED.sk_assunto,
                    sk_origem = EXCLUDED.sk_origem,
                    sk_status = EXCLUDED.sk_status,
                    palavras_chave = EXCLUDED.palavras_chave,
                    setores = EXCLUDED.setores,
                    dias_para_conclusao = EXCLUDED.dias_para_conclusao,
                    qtd_manifestacoes = 1
                """
            ),
            {
                "id_protocolo": row.id_protocolo,
                "sk_data_criacao": sk_from_date(row.data_criacao),
                "sk_data_prorrogacao": sk_from_date(row.data_prorrogacao) if row.data_prorrogacao else None,
                "sk_data_conclusao": sk_from_date(row.data_conclusao) if row.data_conclusao else None,
                "sk_assunto": assunto_map[(row.assunto, row.subassunto)],
                "sk_origem": origem_map[(row.orgao_origem, row.origem_atendimento)],
                "sk_status": status_map[(row.modalidade_atendimento, row.tipo_atendimento, row.situacao)],
                "palavras_chave": row.palavras_chave,
                "setores": row.setores,
                "dias_para_conclusao": row.dias_para_conclusao,
            },
        )
        count += 1
    return count


def run(input_dir: Path, database_url: str) -> int:
    sync_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    df = prepare_dataframe(load_excel_files(input_dir))
    engine = create_engine(sync_url)

    all_dates = set()
    for col in ["data_criacao", "data_prorrogacao", "data_conclusao"]:
        all_dates.update(value for value in df[col].dropna().tolist() if value)

    with engine.begin() as conn:
        upsert_dim_data(conn, all_dates)
        assunto_map, origem_map, status_map = upsert_dimensions(conn, df)
        return upsert_facts(conn, df, assunto_map, origem_map, status_map)


def main() -> None:
    parser = argparse.ArgumentParser(description="Carga OUVE PE para star schema da Ouvidoria ARPE.")
    parser.add_argument("--input-dir", required=True, help="Pasta com arquivos .xlsx/.xls mensais.")
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL"),
        help="URL PostgreSQL. Também pode ser informada via DATABASE_URL.",
    )
    args = parser.parse_args()
    if not args.database_url:
        raise ValueError("Informe --database-url ou a variável DATABASE_URL.")

    loaded = run(Path(args.input_dir), args.database_url)
    print(f"Carga concluída: {loaded} manifestações inseridas/atualizadas.")


if __name__ == "__main__":
    main()
